from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

ENCRYPTED_SECRET_PREFIX = "enc::"


def _get_fernet() -> Fernet:
    settings = get_settings()
    return Fernet(settings.resolved_credential_encryption_key.encode("utf-8"))


def encrypt_secret(value: str) -> str:
    if not value:
        return value
    if value.startswith(ENCRYPTED_SECRET_PREFIX):
        return value
    token = _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")
    return f"{ENCRYPTED_SECRET_PREFIX}{token}"


def decrypt_secret(value: str) -> str:
    if not value:
        return value
    if not value.startswith(ENCRYPTED_SECRET_PREFIX):
        return value

    token = value[len(ENCRYPTED_SECRET_PREFIX) :]
    try:
        return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt stored provider credential") from exc