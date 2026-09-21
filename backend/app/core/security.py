from cryptography.fernet import Fernet
from app.core.config import settings

def get_cipher() -> Fernet:
    key = settings.SECRET_ENCRYPTION_KEY.encode("utf-8")
    return Fernet(key)

def encrypt_password(password: str) -> str:
    if not password:
        return ""
    cipher = get_cipher()
    return cipher.encrypt(password.encode("utf-8")).decode("utf-8")

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password:
        return ""
    cipher = get_cipher()
    return cipher.decrypt(encrypted_password.encode("utf-8")).decode("utf-8")
