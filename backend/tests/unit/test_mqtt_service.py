from app.services import mqtt_service


def test_hivemq_cluster_url_enables_tls_connection(monkeypatch) -> None:
    monkeypatch.setattr(mqtt_service.settings, "mqtt_enabled", False)
    monkeypatch.setattr(mqtt_service.settings, "mqtt_client_id", "sshome-backend")
    monkeypatch.setattr(mqtt_service.settings, "hivemq_cluster_url", "abc123.s1.eu.hivemq.cloud")
    monkeypatch.setattr(mqtt_service.settings, "hivemq_username", "device-user")
    monkeypatch.setattr(mqtt_service.settings, "hivemq_password", "secret")
    monkeypatch.setattr(mqtt_service.settings, "hivemq_port", 8883)

    connection = mqtt_service._resolve_connection_settings()

    assert connection is not None
    assert connection.host == "abc123.s1.eu.hivemq.cloud"
    assert connection.port == 8883
    assert connection.username == "device-user"
    assert connection.password == "secret"
    assert connection.tls is True
    assert connection.client_id.startswith("sshome-backend-")


def test_hivemq_cluster_url_accepts_url_with_scheme(monkeypatch) -> None:
    monkeypatch.setattr(mqtt_service.settings, "mqtt_enabled", False)
    monkeypatch.setattr(mqtt_service.settings, "mqtt_client_id", "sshome-backend")
    monkeypatch.setattr(mqtt_service.settings, "hivemq_cluster_url", "mqtts://abc123.s1.eu.hivemq.cloud:8883")
    monkeypatch.setattr(mqtt_service.settings, "hivemq_username", None)
    monkeypatch.setattr(mqtt_service.settings, "hivemq_password", None)
    monkeypatch.setattr(mqtt_service.settings, "hivemq_port", 8883)

    connection = mqtt_service._resolve_connection_settings()

    assert connection is not None
    assert connection.host == "abc123.s1.eu.hivemq.cloud"
    assert connection.port == 8883
    assert connection.tls is True


def test_mqtt_is_disabled_without_hivemq_or_generic_flag(monkeypatch) -> None:
    monkeypatch.setattr(mqtt_service.settings, "mqtt_enabled", False)
    monkeypatch.setattr(mqtt_service.settings, "hivemq_cluster_url", None)

    assert mqtt_service._resolve_connection_settings() is None
