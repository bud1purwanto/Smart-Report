import logging
from typing import Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("smart_sqvi.telegram")

class TelegramService:
    @staticmethod
    async def send_message(
        text: str,
        chat_id: Optional[str] = None,
        bot_token: Optional[str] = None
    ) -> bool:
        token = bot_token or settings.TELEGRAM_BOT_TOKEN
        cid = chat_id or settings.TELEGRAM_DEFAULT_CHAT_ID
        if not token or not cid:
            logger.warning("Telegram bot token or chat ID not provided. Blast simulated.")
            return False

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": cid,
            "text": text,
            "parse_mode": "HTML"
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    logger.info(f"Telegram message sent successfully to {cid}")
                    return True
                logger.error(f"Telegram API failed: {res.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
            return False

    @staticmethod
    async def send_excel_report(
        excel_bytes: bytes,
        filename: str = "Smart_Report.xlsx",
        caption: str = "📊 Laporan Otomatis Smart Report",
        chat_id: Optional[str] = None,
        bot_token: Optional[str] = None
    ) -> bool:
        token = bot_token or settings.TELEGRAM_BOT_TOKEN
        cid = chat_id or settings.TELEGRAM_DEFAULT_CHAT_ID
        if not token or not cid:
            logger.warning("Telegram bot token or chat ID not provided. Report blast simulated.")
            return False

        url = f"https://api.telegram.org/bot{token}/sendDocument"
        files = {
            "document": (filename, excel_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        }
        data = {
            "chat_id": cid,
            "caption": caption,
            "parse_mode": "HTML"
        }
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(url, data=data, files=files)
                if res.status_code == 200:
                    logger.info(f"Telegram document sent successfully to {cid}")
                    return True
                logger.error(f"Telegram document send failed: {res.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to send Telegram document: {e}")
            return False

telegram_service = TelegramService()

