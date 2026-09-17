from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import encrypt_password
from app.models.server_profile import SapServerProfile
from app.schemas.server import (
    ServerProfileCreate, ServerProfileUpdate, ServerProfileResponse, ServerTestResponse
)
from app.services.sap_rfc import sap_gateway

router = APIRouter(prefix="/servers", tags=["Servers"])

@router.get("", response_model=List[ServerProfileResponse])
def list_servers(db: Session = Depends(get_db)):
    return db.query(SapServerProfile).order_by(SapServerProfile.id.asc()).all()

@router.get("/{server_id}", response_model=ServerProfileResponse)
def get_server(server_id: int, db: Session = Depends(get_db)):
    server = db.query(SapServerProfile).filter(SapServerProfile.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server profile not found")
    return server

@router.post("", response_model=ServerProfileResponse)
def create_server(data: ServerProfileCreate, db: Session = Depends(get_db)):
    existing = db.query(SapServerProfile).filter(SapServerProfile.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Server with this name already exists")
    
    # RULE 4: Password encryption
    enc_pass = encrypt_password(data.password)

    server = SapServerProfile(
        name=data.name,
        sid=data.sid.upper(),
        host=data.host,
        instance=data.instance,
        client=data.client,
        username=data.username,
        encrypted_password=enc_pass,
        environment=data.environment,
        is_active=data.is_active,
        aliases=data.aliases,
        description=data.description
    )
    db.add(server)
    db.commit()
    db.refresh(server)
    return server

@router.put("/{server_id}", response_model=ServerProfileResponse)
def update_server(server_id: int, data: ServerProfileUpdate, db: Session = Depends(get_db)):
    server = db.query(SapServerProfile).filter(SapServerProfile.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server profile not found")

    if data.name is not None:
        server.name = data.name
    if data.sid is not None:
        server.sid = data.sid.upper()
    if data.host is not None:
        server.host = data.host
    if data.instance is not None:
        server.instance = data.instance
    if data.client is not None:
        server.client = data.client
    if data.username is not None:
        server.username = data.username
    if data.password is not None and data.password != "":
        # RULE 4: Encrypt new password
        server.encrypted_password = encrypt_password(data.password)
    if data.environment is not None:
        server.environment = data.environment
    if data.is_active is not None:
        server.is_active = data.is_active
    if data.aliases is not None:
        server.aliases = data.aliases
    if data.description is not None:
        server.description = data.description

    db.commit()
    db.refresh(server)
    return server

@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_server(server_id: int, db: Session = Depends(get_db)):
    server = db.query(SapServerProfile).filter(SapServerProfile.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server profile not found")
    db.delete(server)
    db.commit()
    return None

@router.post("/{server_id}/test", response_model=ServerTestResponse)
async def test_server_connection(server_id: int, db: Session = Depends(get_db)):
    """Tests live connection to SAP server profile via MCP gateway."""
    server = db.query(SapServerProfile).filter(SapServerProfile.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server profile not found")

    test_res = await sap_gateway.test_server_connection(server)
    return ServerTestResponse(
        success=test_res.get("success", False),
        server_id=server.id,
        server_name=server.name,
        mode=test_res.get("mode", "UNKNOWN"),
        system_info=test_res.get("system_info"),
        error=test_res.get("error")
    )

