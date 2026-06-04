import hashlib

import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def hash_refresh_token(token: str) -> str:
    """Refresh tokens are high-entropy random strings, so a fast SHA-256 digest is
    enough to make a database leak non-reusable (no need for a slow KDF here)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
