# Security Features

This document describes the security measures implemented in the SSHome backend and explains how they support the diploma theme: "IoT application for smart home with enhanced security".

## 1. External Authentication Integration

The smart home backend does not rely on anonymous access for protected business endpoints.

Implemented features:

- bearer token is required for protected REST endpoints
- bearer token is required for websocket connections
- support for two authentication modes:
  - local JWT validation
  - external token introspection
- access token type validation
- owner identifier extraction from trusted token claims

Security value:

- prevents unauthorized access to smart home resources
- allows the backend to trust an external authentication service without duplicating identity logic
- ensures requests are bound to a specific authenticated owner

Relevant files:

- `app/core/auth.py`
- `app/core/deps.py`
- `app/integrations/auth_client.py`
- `app/websockets/router.py`

## 2. Strict Resource Isolation by owner_id

All core domain operations are scoped by `owner_id` extracted from the token.

Protected entities:

- homes
- rooms
- devices
- events
- scenarios
- realtime device updates

Security value:

- one user cannot read another user's home structure
- one user cannot control another user's devices
- one user cannot access another user's event history
- one user cannot run another user's automation scenarios
- one user cannot subscribe to another user's realtime websocket stream

Relevant files:

- `app/services/home_service.py`
- `app/services/room_service.py`
- `app/services/device_service.py`
- `app/services/event_service.py`
- `app/services/scenario_service.py`
- `app/websockets/manager.py`

## 3. Business Validation of Device Commands

The backend protects devices from invalid or unsafe commands through explicit business validation.

Implemented rules:

- `LIGHT` supports only `TURN_ON` and `TURN_OFF`
- `AC` supports only `TURN_ON` and `TURN_OFF`
- `DOOR` supports only `OPEN` and `CLOSE`
- `TEMP` is effectively read-only and rejects control commands

Security value:

- prevents invalid state transitions
- reduces risk of logic abuse through malformed but authenticated requests
- ensures device behavior is constrained by domain rules instead of trusting client input

Relevant files:

- `app/models/enums.py`
- `app/services/device_service.py`

## 4. Event Audit Trail for Device Control

Every accepted device control command produces an `Event`.

Stored information:

- device identifier
- action
- timestamp
- owner identifier

Security value:

- creates an audit trail for device activity
- allows investigation of who performed a control operation
- helps demonstrate accountability and traceability in the system

Relevant files:

- `app/models/event.py`
- `app/services/device_service.py`
- `app/services/event_service.py`
- `app/routes/events.py`

## 5. Secure Scenario Execution

Scenario execution is not allowed to bypass device control logic.

Implemented protections:

- scenario steps are validated before execution
- each scenario action references only owned devices
- each action is validated against the target device type
- scenario execution reuses the same device-control core used by single-device commands
- scenario execution produces events for each action

Security value:

- prevents scenarios from becoming a privileged bypass around normal controls
- keeps automation under the same safety and audit rules as manual commands
- reduces architectural security gaps between manual and automated operations

Relevant files:

- `app/models/scenario.py`
- `app/services/scenario_service.py`
- `app/services/device_service.py`
- `app/routes/scenarios.py`

## 6. Realtime Security for WebSocket Updates

The realtime channel is protected, authenticated, and owner-scoped.

Implemented protections:

- websocket requires bearer token
- websocket token is validated before connection is accepted
- each connection is associated with an `owner_id`
- updates are broadcast only to sockets belonging to the same owner

Security value:

- prevents unauthorized subscription to smart home updates
- prevents information leakage between tenants
- keeps realtime control notifications aligned with REST authorization rules

Relevant files:

- `app/websockets/router.py`
- `app/websockets/manager.py`
- `app/websockets/publisher.py`
- `app/schemas/realtime.py`

## 7. Rate Limiting for Critical Operations

The backend includes in-memory rate limiting for the most sensitive control flows.

Protected flows:

- device action requests
- scenario run requests
- websocket connection attempts

Security value:

- reduces abuse of device control endpoints
- helps mitigate brute-force style operational flooding
- reduces the risk of accidental or malicious overload on realtime and automation channels

Current configuration fields:

- `security_rate_limit_window_seconds`
- `security_device_action_rate_limit`
- `security_scenario_run_rate_limit`
- `security_websocket_connect_rate_limit`

Relevant files:

- `app/core/rate_limit.py`
- `app/routes/devices.py`
- `app/routes/scenarios.py`
- `app/websockets/router.py`
- `app/core/config.py`

## 8. Request Body Size Limiting

The backend limits HTTP request body size.

Security value:

- reduces abuse through oversized payloads
- lowers risk of simple resource exhaustion attacks
- helps keep API processing predictable under hostile or malformed input

Current configuration field:

- `security_max_request_body_bytes`

Relevant files:

- `app/core/http_security.py`
- `app/core/config.py`

## 9. HTTP Security Headers

The backend adds defensive HTTP response headers.

Configured headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cache-Control: no-store`
- optional `Strict-Transport-Security`

Security value:

- reduces browser-side abuse opportunities
- prevents clickjacking through framing
- reduces metadata leakage through referrers
- disables unnecessary browser capabilities by policy
- avoids caching sensitive API responses in intermediary or client contexts

Current configuration field:

- `security_enable_hsts`

Relevant files:

- `app/core/http_security.py`
- `app/core/config.py`

## 10. Scenario Complexity Limits

Scenario creation is limited by the maximum allowed number of actions.

Security value:

- prevents oversized automation payloads
- reduces abuse through extremely large scenario execution chains
- keeps automation execution time and resource usage bounded

Current configuration field:

- `scenario_max_actions`

Relevant files:

- `app/schemas/scenario.py`
- `app/core/config.py`

## 11. Password Hashing for Built-In Auth Module

Although the diploma smart-home flow uses external authentication integration, the codebase also contains password hashing utilities for the built-in auth module.

Implemented feature:

- password hashing with `bcrypt`

Security value:

- avoids plain-text password storage in the built-in auth subsystem
- demonstrates use of industry-standard password hashing

Relevant files:

- `app/core/security.py`

## 12. Security Testing Coverage

Security-related behavior is covered by automated tests.

Covered areas include:

- auth token validation
- owner scoping
- invalid command rejection
- event creation
- websocket authentication
- websocket owner isolation
- rate limiting
- request size limits
- scenario limits
- security headers

Security value:

- reduces risk of regressions in protective controls
- helps show that security mechanisms are verified, not just declared

Relevant files:

- `tests/api/test_system_routes.py`
- `tests/api/test_device_routes.py`
- `tests/api/test_home_room_routes.py`
- `tests/api/test_scenario_routes.py`
- `tests/api/test_websocket_routes.py`
- `tests/unit/test_auth.py`

## Summary for Diploma Defense

The backend justifies the "enhanced security" theme through a combination of:

- authenticated access
- strict tenant isolation by owner
- safe business validation for device commands
- auditability through events
- protected automation execution
- protected realtime communication
- anti-abuse controls such as rate limiting and request size limiting
- secure HTTP defaults
- automated verification through tests

This is stronger than a basic CRUD API because the system protects both data access and control operations, which is especially important for IoT and smart home scenarios.
