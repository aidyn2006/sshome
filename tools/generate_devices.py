"""
Factory device generator.

Usage:
    python tools/generate_devices.py --count 10 --type LIGHT
    python tools/generate_devices.py --count 5 --type DOOR
    python tools/generate_devices.py --list

Appends new devices to:
  manufactured_devices.json  — public registry (committed to repo, secrets are hashed)
  manufactured_secrets.txt   — plaintext secrets for flashing (NEVER commit this)
"""

import argparse
import hashlib
import json
import random
import secrets
import string
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent.parent
REGISTRY_FILE = ROOT / "manufactured_devices.json"
SECRETS_FILE = ROOT / "manufactured_secrets.txt"

VALID_TYPES = ["LIGHT", "DOOR", "AC", "TEMP", "CAMERA", "MOTION"]


def _random_suffix(length: int = 6) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


def _hash_secret(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()


def _load_registry() -> list[dict]:
    if not REGISTRY_FILE.exists():
        return []
    return json.loads(REGISTRY_FILE.read_text())


def _save_registry(devices: list[dict]) -> None:
    REGISTRY_FILE.write_text(json.dumps(devices, indent=2))


def _existing_ids(devices: list[dict]) -> set[str]:
    return {d["hardware_id"] for d in devices}


def generate(count: int, device_type: str) -> None:
    if device_type not in VALID_TYPES:
        print(f"Unknown type '{device_type}'. Valid: {', '.join(VALID_TYPES)}")
        sys.exit(1)

    registry = _load_registry()
    existing = _existing_ids(registry)

    new_devices = []
    secrets_lines = []
    batch_date = date.today().strftime("%Y%m%d")

    for _ in range(count):
        suffix = _random_suffix()
        hardware_id = f"sshome_{batch_date}_{suffix}"
        while hardware_id in existing:
            suffix = _random_suffix()
            hardware_id = f"sshome_{batch_date}_{suffix}"
        existing.add(hardware_id)

        plain_secret = secrets.token_hex(32)
        secret_hash = _hash_secret(plain_secret)

        new_devices.append({
            "hardware_id": hardware_id,
            "device_type": device_type,
            "secret_hash": secret_hash,
            "batch": batch_date,
            "claimed": False,
        })
        secrets_lines.append(f"{hardware_id}\t{plain_secret}")

    registry.extend(new_devices)
    _save_registry(registry)

    with SECRETS_FILE.open("a") as f:
        f.write("\n".join(secrets_lines) + "\n")

    print(f"Generated {count} {device_type} device(s):\n")
    for d in new_devices:
        print(f"  {d['hardware_id']}")
    print(f"\nRegistry: {REGISTRY_FILE}")
    print(f"Secrets (for flashing): {SECRETS_FILE}  << KEEP PRIVATE, never commit")


def list_devices() -> None:
    registry = _load_registry()
    if not registry:
        print("No devices yet.")
        return
    print(f"{'hardware_id':<35} {'type':<8} {'claimed':<8} {'batch'}")
    print("-" * 70)
    for d in registry:
        print(f"{d['hardware_id']:<35} {d['device_type']:<8} {str(d['claimed']):<8} {d['batch']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SSHome device factory generator")
    sub = parser.add_subparsers(dest="cmd")

    gen = sub.add_parser("generate", help="Generate new devices")
    gen.add_argument("--count", type=int, default=5)
    gen.add_argument("--type", dest="device_type", default="LIGHT")

    sub.add_parser("list", help="List all manufactured devices")

    args = parser.parse_args()
    if args.cmd == "generate":
        generate(args.count, args.device_type)
    elif args.cmd == "list":
        list_devices()
    else:
        parser.print_help()
