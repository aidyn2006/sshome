import pytest

pytestmark = pytest.mark.integration


def test_http_workflow_creates_links_and_updates_entities(integration_client) -> None:
    integration_client.register_user(email="owner-one@example.com", name="Owner One")
    tokens = integration_client.login_user(email="owner-one@example.com")
    headers = integration_client.auth_headers(tokens["access_token"])

    auth_context_response = integration_client.client.get("/api/v1/auth-context/me", headers=headers)
    assert auth_context_response.status_code == 200
    owner_id = auth_context_response.json()["owner_id"]

    home_response = integration_client.client.post(
        "/api/v1/homes",
        json={"name": "Primary Home"},
        headers=headers,
    )
    assert home_response.status_code == 201
    home_id = home_response.json()["id"]
    assert home_response.json()["owner_id"] == owner_id

    list_homes_response = integration_client.client.get("/api/v1/homes", headers=headers)
    assert list_homes_response.status_code == 200
    assert [home["id"] for home in list_homes_response.json()] == [home_id]

    room_response = integration_client.client.post(
        "/api/v1/rooms",
        json={"name": "Living Room", "home_id": home_id},
        headers=headers,
    )
    assert room_response.status_code == 201
    room_id = room_response.json()["id"]

    list_rooms_response = integration_client.client.get(f"/api/v1/rooms?home_id={home_id}", headers=headers)
    assert list_rooms_response.status_code == 200
    assert [room["id"] for room in list_rooms_response.json()] == [room_id]

    device_response = integration_client.client.post(
        "/api/v1/devices",
        json={"name": "Main Light", "type": "LIGHT", "room_id": room_id},
        headers=headers,
    )
    assert device_response.status_code == 201
    device = device_response.json()
    assert device["status"] == "OFF"
    assert device["owner_id"] == owner_id
    device_id = device["id"]

    get_device_response = integration_client.client.get(f"/api/v1/devices/{device_id}", headers=headers)
    assert get_device_response.status_code == 200
    assert get_device_response.json()["room_id"] == room_id

    action_response = integration_client.client.post(
        f"/api/v1/devices/{device_id}/action",
        json={"action": "TURN_ON"},
        headers=headers,
    )
    assert action_response.status_code == 200
    assert action_response.json()["status"] == "ON"

    scenario_response = integration_client.client.post(
        "/api/v1/scenarios",
        json={
            "name": "Night Mode",
            "description": "Turn the light off",
            "actions": [{"device_id": device_id, "action": "TURN_OFF"}],
        },
        headers=headers,
    )
    assert scenario_response.status_code == 201
    scenario_id = scenario_response.json()["id"]

    list_scenarios_response = integration_client.client.get("/api/v1/scenarios", headers=headers)
    assert list_scenarios_response.status_code == 200
    assert [scenario["id"] for scenario in list_scenarios_response.json()] == [scenario_id]

    run_scenario_response = integration_client.client.post(
        f"/api/v1/scenarios/{scenario_id}/run",
        headers=headers,
    )
    assert run_scenario_response.status_code == 200
    assert run_scenario_response.json()["executed_actions"] == 1
    assert run_scenario_response.json()["devices"][0]["status"] == "OFF"

    list_events_response = integration_client.client.get(f"/api/v1/events?home_id={home_id}", headers=headers)
    assert list_events_response.status_code == 200
    assert len(list_events_response.json()) == 2
    assert {event["action"] for event in list_events_response.json()} == {"TURN_ON", "TURN_OFF"}

    list_device_events_response = integration_client.client.get(
        f"/api/v1/events/device/{device_id}",
        headers=headers,
    )
    assert list_device_events_response.status_code == 200
    assert [event["device_id"] for event in list_device_events_response.json()] == [device_id, device_id]


def test_http_workflow_enforces_owner_isolation_across_resources(integration_client) -> None:
    integration_client.register_user(email="owner-one@example.com", name="Owner One")
    owner_one_tokens = integration_client.login_user(email="owner-one@example.com")
    owner_one_headers = integration_client.auth_headers(owner_one_tokens["access_token"])

    home_response = integration_client.client.post(
        "/api/v1/homes",
        json={"name": "Owner One Home"},
        headers=owner_one_headers,
    )
    assert home_response.status_code == 201
    home_id = home_response.json()["id"]

    room_response = integration_client.client.post(
        "/api/v1/rooms",
        json={"name": "Office", "home_id": home_id},
        headers=owner_one_headers,
    )
    assert room_response.status_code == 201
    room_id = room_response.json()["id"]

    device_response = integration_client.client.post(
        "/api/v1/devices",
        json={"name": "Front Door", "type": "DOOR", "room_id": room_id},
        headers=owner_one_headers,
    )
    assert device_response.status_code == 201
    device_id = device_response.json()["id"]

    integration_client.register_user(email="owner-two@example.com", name="Owner Two")
    owner_two_tokens = integration_client.login_user(email="owner-two@example.com")
    owner_two_headers = integration_client.auth_headers(owner_two_tokens["access_token"])

    list_homes_response = integration_client.client.get("/api/v1/homes", headers=owner_two_headers)
    assert list_homes_response.status_code == 200
    assert list_homes_response.json() == []

    get_home_response = integration_client.client.get(f"/api/v1/homes/{home_id}", headers=owner_two_headers)
    assert get_home_response.status_code == 404
    assert get_home_response.json()["detail"] == "Home not found"

    create_room_response = integration_client.client.post(
        "/api/v1/rooms",
        json={"name": "Intrusion", "home_id": home_id},
        headers=owner_two_headers,
    )
    assert create_room_response.status_code == 404
    assert create_room_response.json()["detail"] == "Home not found"

    get_device_response = integration_client.client.get(f"/api/v1/devices/{device_id}", headers=owner_two_headers)
    assert get_device_response.status_code == 404
    assert get_device_response.json()["detail"] == "Device not found"

    scenario_response = integration_client.client.post(
        "/api/v1/scenarios",
        json={
            "name": "Tamper Attempt",
            "actions": [{"device_id": device_id, "action": "OPEN"}],
        },
        headers=owner_two_headers,
    )
    assert scenario_response.status_code == 404
    assert scenario_response.json()["detail"] == "Device not found"

    list_events_response = integration_client.client.get(
        f"/api/v1/events?home_id={home_id}",
        headers=owner_two_headers,
    )
    assert list_events_response.status_code == 404
    assert list_events_response.json()["detail"] == "Home not found"
