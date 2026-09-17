import logging
from datetime import datetime, timezone
import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.database import SessionLocal
from app.models.schedule import ReportSchedule
from app.models.saved_query import SavedQuery
from app.models.server_profile import SapServerProfile
from app.models.variant import ReportVariant
from app.schemas.query import QueryDefinition
from app.services.sap_rfc import sap_gateway
from app.services.pandas_engine import pandas_engine
from app.services.telegram import telegram_service

logger = logging.getLogger("smart_sqvi.scheduler")

scheduler = AsyncIOScheduler()

async def run_report_schedule(schedule_id: int):
    """Executes a scheduled report job, processes data with pandas, and blasts to Telegram."""
    logger.info(f"Triggering scheduled report #{schedule_id}...")
    db = SessionLocal()
    try:
        schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
        if not schedule or not schedule.is_active:
            return

        query_record = db.query(SavedQuery).filter(SavedQuery.id == schedule.query_id).first()
        if not query_record:
            schedule.last_status = "ERROR"
            schedule.last_error = f"Query {schedule.query_id} not found."
            db.commit()
            return

        server = None
        if schedule.server_id:
            server = db.query(SapServerProfile).filter(SapServerProfile.id == schedule.server_id).first()
        if not server:
            # Pick first active server
            server = db.query(SapServerProfile).filter(SapServerProfile.is_active == True).first()

        query_def = QueryDefinition(**query_record.query_json)
        
        # Primary table and fields
        primary_table = query_def.tables[0].table if query_def.tables else "MARA"
        fields = [f.field for f in query_def.selectedFields]
        where = []
        for flt in query_def.filters:
            f_name = flt.field.split(".")[-1]
            if flt.operator == "EQ":
                where.append(f"{f_name} = '{flt.value}'")

        # Execute query to SAP
        res = await sap_gateway.read_table(
            server_profile=server,
            table=primary_table,
            fields=fields,
            where=where,
            rowcount=500
        )
        rows = res.get("rows", [])
        df = pd.DataFrame(rows)

        # Apply variant if assigned
        variant = None
        if schedule.variant_id:
            variant = db.query(ReportVariant).filter(ReportVariant.id == schedule.variant_id).first()
            if variant and variant.custom_columns:
                df = pandas_engine.apply_custom_formulas(df, variant.custom_columns)

        # Apply deduplication and anonymization (Rule 4)
        if schedule.deduplicate:
            df = pandas_engine.deduplicate(df)
        if schedule.anonymize:
            df = pandas_engine.anonymize(df)

        # Export to Excel
        filename = f"{query_record.name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        excel_bytes = pandas_engine.export_to_excel(
            df=df,
            title=query_record.name[:30],
            anonymize=False, # already anonymized above
            deduplicate=False
        )

        caption = (
            f"📊 <b>Smart Report Scheduled Report</b>\n"
            f"<b>Laporan:</b> {query_record.name}\n"
            f"<b>Server:</b> {server.name if server else 'N/A'} ({server.sid if server else ''})\n"
            f"<b>Total Baris:</b> {len(df):,} baris\n"
            f"<b>Waktu:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )

        # Send via Telegram
        if schedule.channel == "telegram":
            await telegram_service.send_excel_report(
                excel_bytes=excel_bytes,
                filename=filename,
                caption=caption,
                chat_id=schedule.telegram_chat_id,
                bot_token=schedule.telegram_bot_token
            )

        schedule.last_run_at = datetime.now(timezone.utc)
        schedule.last_status = "SUCCESS"
        schedule.last_error = None
        db.commit()
        logger.info(f"Schedule #{schedule_id} executed successfully.")

    except Exception as e:
        logger.error(f"Failed to execute schedule #{schedule_id}: {e}")
        try:
            schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
            if schedule:
                schedule.last_status = "ERROR"
                schedule.last_error = str(e)
                schedule.last_run_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

def reload_all_schedules():
    """Reads all active schedules from DB and registers them in APScheduler."""
    scheduler.remove_all_jobs()
    db = SessionLocal()
    try:
        active_schedules = db.query(ReportSchedule).filter(ReportSchedule.is_active == True).all()
        for s in active_schedules:
            try:
                # Expected cron format: "minute hour day month day_of_week"
                parts = s.cron_expression.strip().split()
                if len(parts) == 5:
                    minute, hour, day, month, day_of_week = parts
                    trigger = CronTrigger(
                        minute=minute, hour=hour, day=day, month=month, day_of_week=day_of_week
                    )
                    scheduler.add_job(
                        run_report_schedule,
                        trigger=trigger,
                        args=[s.id],
                        id=f"schedule_{s.id}",
                        replace_existing=True
                    )
                    logger.info(f"Registered job for schedule #{s.id} ({s.cron_expression})")
            except Exception as cron_err:
                logger.warning(f"Invalid cron expression for schedule #{s.id}: {cron_err}")
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.start()
        reload_all_schedules()
        logger.info("APScheduler started successfully.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")

