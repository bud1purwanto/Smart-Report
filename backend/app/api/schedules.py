from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.schedule import ReportSchedule
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.tasks.scheduler import reload_all_schedules, run_report_schedule

router = APIRouter(prefix="/schedules", tags=["Schedules"])

@router.get("", response_model=List[ScheduleResponse])
def list_schedules(db: Session = Depends(get_db)):
    return db.query(ReportSchedule).order_by(ReportSchedule.id.desc()).all()

@router.post("", response_model=ScheduleResponse)
def create_schedule(data: ScheduleCreate, db: Session = Depends(get_db)):
    schedule = ReportSchedule(
        query_id=data.query_id,
        variant_id=data.variant_id,
        server_id=data.server_id,
        name=data.name,
        cron_expression=data.cron_expression,
        channel=data.channel,
        telegram_chat_id=data.telegram_chat_id,
        telegram_bot_token=data.telegram_bot_token,
        anonymize=data.anonymize,
        deduplicate=data.deduplicate,
        export_format=data.export_format,
        is_active=data.is_active
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    # Reload APScheduler jobs
    reload_all_schedules()
    return schedule

@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule

@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(schedule_id: int, data: ScheduleUpdate, db: Session = Depends(get_db)):
    schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if data.name is not None:
        schedule.name = data.name
    if data.variant_id is not None:
        schedule.variant_id = data.variant_id
    if data.server_id is not None:
        schedule.server_id = data.server_id
    if data.cron_expression is not None:
        schedule.cron_expression = data.cron_expression
    if data.channel is not None:
        schedule.channel = data.channel
    if data.telegram_chat_id is not None:
        schedule.telegram_chat_id = data.telegram_chat_id
    if data.telegram_bot_token is not None:
        schedule.telegram_bot_token = data.telegram_bot_token
    if data.anonymize is not None:
        schedule.anonymize = data.anonymize
    if data.deduplicate is not None:
        schedule.deduplicate = data.deduplicate
    if data.export_format is not None:
        schedule.export_format = data.export_format
    if data.is_active is not None:
        schedule.is_active = data.is_active

    db.commit()
    db.refresh(schedule)
    reload_all_schedules()
    return schedule

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    reload_all_schedules()
    return None

@router.post("/{schedule_id}/run")
async def run_schedule_now(schedule_id: int, db: Session = Depends(get_db)):
    """Triggers immediate execution and Telegram blast for a schedule."""
    schedule = db.query(ReportSchedule).filter(ReportSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await run_report_schedule(schedule_id)
    db.refresh(schedule)
    return {
        "status": schedule.last_status,
        "last_run_at": schedule.last_run_at,
        "last_error": schedule.last_error
    }

