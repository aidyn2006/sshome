import json
import logging
import ssl
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

from app.core.config import settings
from app.models.device import Device
from app.models.enums import DeviceAction, DeviceType

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MqttConnectionSettings:
    host: str
    port: int
    username: str | None
    password: str | None
    tls: bool
    client_id: str


def _parse_cluster_host(cluster_url: str) -> str:
    normalized_url = cluster_url.strip()
    if "://" not in normalized_url:
        normalized_url = f"mqtts://{normalized_url}"

    parsed = urlparse(normalized_url)
    return (parsed.hostname or "").strip()


def _resolve_connection_settings() -> MqttConnectionSettings | None:
    cluster_url = settings.hivemq_cluster_url.strip() if settings.hivemq_cluster_url else ""

    if cluster_url:
        host = _parse_cluster_host(cluster_url)
        if not host:
            logger.warning("HIVEMQ_CLUSTER_URL is set but broker host could not be parsed")
            return None

        return MqttConnectionSettings(
            host=host,
            port=settings.hivemq_port,
            username=settings.hivemq_username or settings.mqtt_username,
            password=settings.hivemq_password or settings.mqtt_password,
            tls=True,
            client_id=f"{settings.mqtt_client_id}-{uuid4().hex[:8]}",
        )

    if not settings.mqtt_enabled:
        return None

    return MqttConnectionSettings(
        host=settings.mqtt_host,
        port=settings.mqtt_port,
        username=settings.mqtt_username,
        password=settings.mqtt_password,
        tls=settings.mqtt_tls,
        client_id=f"{settings.mqtt_client_id}-{uuid4().hex[:8]}",
    )


def _command_payload(*, device_type: DeviceType, action: DeviceAction) -> dict[str, Any] | None:
    if device_type == DeviceType.LIGHT:
        if action == DeviceAction.TURN_ON:
            return {"action": "toggle_light", "value": 1}
        if action == DeviceAction.TURN_OFF:
            return {"action": "toggle_light", "value": 0}

    if device_type == DeviceType.DOOR:
        if action == DeviceAction.OPEN:
            return {"action": "open_door", "value": 1}
        if action == DeviceAction.CLOSE:
            return {"action": "close_door", "value": 0}

    if device_type == DeviceType.AC:
        if action == DeviceAction.TURN_ON:
            return {"action": "toggle_ac", "value": 1}
        if action == DeviceAction.TURN_OFF:
            return {"action": "toggle_ac", "value": 0}

    return None


def publish_device_command(*, device: Device, action: DeviceAction) -> None:
    connection = _resolve_connection_settings()
    if connection is None or device.hardware_id is None:
        return

    payload = _command_payload(device_type=device.type, action=action)
    if payload is None:
        return

    try:
        import paho.mqtt.publish as publish

        auth = None
        if connection.username:
            auth = {"username": connection.username, "password": connection.password}

        tls = {"tls_version": ssl.PROTOCOL_TLS_CLIENT} if connection.tls else None
        publish.single(
            topic=f"devices/{device.hardware_id}/commands",
            payload=json.dumps(payload),
            hostname=connection.host,
            port=connection.port,
            client_id=connection.client_id,
            auth=auth,
            tls=tls,
        )
    except Exception:
        logger.exception("Unable to publish MQTT command for device %s", device.id)
