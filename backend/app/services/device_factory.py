from __future__ import annotations

import hashlib
import json
import secrets
import string
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path

from app.models.enums import DeviceType


@dataclass(slots=True)
class ManufacturedDeviceRecord:
    hardware_id: str
    device_type: str
    secret: str
    secret_hash: str
    batch: str
    claimed: bool = False


def _find_registry_file() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        candidate = parent / "manufactured_devices.json"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("manufactured_devices.json not found")


def _secrets_file() -> Path:
    registry_file = _find_registry_file()
    path = registry_file.with_name("manufactured_secrets.txt")
    if path.is_dir():
        return path / "generated_secrets.txt"
    return path


def _load_registry() -> list[dict]:
    registry_file = _find_registry_file()
    return json.loads(registry_file.read_text(encoding="utf-8"))


def _save_registry(devices: list[dict]) -> None:
    registry_file = _find_registry_file()
    registry_file.write_text(json.dumps(devices, indent=2), encoding="utf-8")


def _random_suffix(length: int = 6) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def _hash_secret(plain: str) -> str:
    return hashlib.sha256(plain.encode("utf-8")).hexdigest()


def generate_manufactured_devices(*, count: int, device_type: DeviceType) -> list[ManufacturedDeviceRecord]:
    registry = _load_registry()
    existing_ids = {str(device["hardware_id"]) for device in registry}
    batch = date.today().strftime("%Y%m%d")

    generated: list[ManufacturedDeviceRecord] = []
    secrets_lines: list[str] = []

    for _ in range(count):
        suffix = _random_suffix()
        hardware_id = f"sshome_{batch}_{suffix}"
        while hardware_id in existing_ids:
            suffix = _random_suffix()
            hardware_id = f"sshome_{batch}_{suffix}"

        plain_secret = secrets.token_hex(32)
        secret_hash = _hash_secret(plain_secret)

        generated.append(
            ManufacturedDeviceRecord(
                hardware_id=hardware_id,
                device_type=device_type.value,
                secret=plain_secret,
                secret_hash=secret_hash,
                batch=batch,
                claimed=False,
            )
        )
        secrets_lines.append(f"{hardware_id}\t{plain_secret}")
        existing_ids.add(hardware_id)

    registry.extend(asdict(item) for item in generated)
    _save_registry(registry)

    secrets_file = _secrets_file()
    with secrets_file.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(secrets_lines) + "\n")

    return generated
