"""
Device registry — validates hardware_ids against the manufacturer list.

manufactured_devices.json lives in the project root and contains all devices
we have ever produced. Only devices in this list can be registered by users.
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_registry: dict[str, dict] = {}
_loaded_mtime: float | None = None


def _find_registry_file() -> Path | None:
    candidates = [
        Path(__file__).parent.parent.parent.parent / "manufactured_devices.json",
        Path("manufactured_devices.json"),
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def load() -> None:
    global _registry, _loaded_mtime
    path = _find_registry_file()
    if path is None:
        logger.warning("manufactured_devices.json not found — device registry disabled")
        return

    try:
        mtime = path.stat().st_mtime
        if _loaded_mtime == mtime and _registry:
            return  # file unchanged since last load
        devices: list[dict] = json.loads(path.read_text(encoding="utf-8"))
        _registry = {d["hardware_id"]: d for d in devices}
        _loaded_mtime = mtime
        logger.info("Device registry loaded: %d device(s) from %s", len(_registry), path)
    except Exception:
        logger.exception("Failed to load device registry from %s", path)


def is_known_device(hardware_id: str) -> bool:
    """True if this hardware_id was produced by us."""
    load()  # re-read file so devices generated after startup are visible
    if not _registry:
        # Fail closed: with no registry we cannot vouch for any hardware_id.
        logger.warning("Device registry is empty — rejecting hardware_id %s", hardware_id)
        return False
    return hardware_id in _registry


def is_claimed(hardware_id: str) -> bool:
    """True if this device is already linked to an account."""
    entry = _registry.get(hardware_id)
    return bool(entry and entry.get("claimed"))


def get_secret_hash(hardware_id: str) -> str | None:
    entry = _registry.get(hardware_id)
    return entry["secret_hash"] if entry else None


def mark_claimed(hardware_id: str) -> None:
    """Update in-memory registry. The JSON file is updated separately via save()."""
    if hardware_id in _registry:
        _registry[hardware_id]["claimed"] = True
        _save()


def _save() -> None:
    path = _find_registry_file()
    if path is None:
        return
    try:
        path.write_text(
            json.dumps(list(_registry.values()), indent=2),
            encoding="utf-8",
        )
    except Exception:
        logger.exception("Failed to save device registry")
