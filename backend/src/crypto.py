"""토큰 암호화/복호화 유틸리티 (Fernet)"""
import base64
import hashlib

from cryptography.fernet import Fernet

from src.config import get_settings

settings = get_settings()


def _get_fernet() -> Fernet:
    """설정의 secret key로부터 Fernet 인스턴스 생성.

    Fernet은 정확히 32바이트 url-safe base64 키를 요구하므로,
    jwt_secret_key를 SHA-256 해시하여 32바이트 키를 파생한다.
    """
    key_bytes = hashlib.sha256(settings.jwt_secret_key.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_token(plain_token: str) -> str:
    """평문 토큰을 암호화하여 문자열로 반환"""
    f = _get_fernet()
    return f.encrypt(plain_token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """암호화된 토큰을 복호화하여 평문 반환"""
    f = _get_fernet()
    return f.decrypt(encrypted_token.encode()).decode()
