from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from app.services.ai_prompt import ai_prompt_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

class AiChatRequest(BaseModel):
    prompt: str

@router.post("/chat")
async def chat_to_query(req: AiChatRequest):
    """
    Translates natural language prompt into visual query builder nodes and edges.
    Outputs structured JSON ready for 'Apply to Canvas'.
    """
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    result = await ai_prompt_service.translate_prompt_to_query(req.prompt)
    return result

