# Backend + AI Handoff (Focus: 3D Scene MVP)

## 1) Scope (только для 3D комнаты)
Клиентский 3D экран управляет 3 объектами:
- `light` (лампа)
- `door` (дверь)
- `window` (окно)

UI действия:
- тап по 3D объекту
- тап по HUD кнопке объекта
- массовые кнопки:
  - `POWER ON ALL`
  - `POWER OFF ALL`

Требование:
- любое действие должно синхронно менять backend state
- state из backend должен обновлять 3D сцену

---

## 2) Минимальная доменная модель

## Device
```json
{
  "id": "lamp_1",
  "type": "light",
  "status": true,
  "room": "living_room"
}
```

Рекомендуемые типы:
- `light`
- `door`
- `window`

Для единообразия:
- `light.status`: `true=ON`, `false=OFF`
- `door/window.status`: `true=OPEN`, `false=CLOSED`

## Home state (срез для 3D)
```json
{
  "room": "living_room",
  "light": true,
  "door": false,
  "window": true,
  "updatedAt": "2026-05-05T12:00:00Z"
}
```

---

## 3) REST API (MVP)

## 3.1 Получить список устройств
`GET /devices`

Ответ:
```json
[
  { "id": "lamp_1", "type": "light", "status": true, "room": "living_room" },
  { "id": "door_1", "type": "door", "status": false, "room": "living_room" },
  { "id": "window_1", "type": "window", "status": true, "room": "living_room" }
]
```

## 3.2 Переключить устройство
`POST /devices/{id}/toggle`

Ответ:
```json
{ "id": "lamp_1", "type": "light", "status": false, "room": "living_room" }
```

## 3.3 Получить текущее состояние дома (для 3D)
`GET /state`

Ответ:
```json
{
  "room": "living_room",
  "light": false,
  "door": true,
  "window": false,
  "updatedAt": "2026-05-05T12:01:21Z"
}
```

## 3.4 Запуск сцены
`POST /scenes/run`

Запрос:
```json
{
  "name": "night_mode"
}
```

Ответ:
```json
{
  "name": "night_mode",
  "applied": true,
  "state": { "light": false, "door": true, "window": false }
}
```

---

## 4) Сцены для 3D экрана

Минимум 2 сцены:

## `all_on`
```json
{
  "name": "all_on",
  "actions": [
    { "device": "light", "value": true },
    { "device": "door", "value": true },
    { "device": "window", "value": true }
  ]
}
```

## `all_off`
```json
{
  "name": "all_off",
  "actions": [
    { "device": "light", "value": false },
    { "device": "door", "value": false },
    { "device": "window", "value": false }
  ]
}
```

Соответствие UI:
- кнопка `POWER ON ALL` -> `all_on`
- кнопка `POWER OFF ALL` -> `all_off`

---

## 5) История действий (обязательно для AI)
Каждое действие пишется в `device_events`:

```json
{
  "id": "evt_1001",
  "deviceId": "lamp_1",
  "deviceType": "light",
  "action": "turn_off",
  "source": "3d_tap",
  "timestamp": "2026-05-05T23:00:10Z"
}
```

`source`:
- `3d_tap`
- `hud_button`
- `scene_run`
- `ai_auto`

---

## 6) Realtime (рекомендуется)
WebSocket канал состояния:
- `ws://.../ws/state`

Сервер пушит изменения:
```json
{
  "type": "state_updated",
  "state": { "light": false, "door": true, "window": false },
  "updatedAt": "2026-05-05T23:00:10Z"
}
```

Ивент для AI рекомендации:
```json
{
  "type": "ai_suggestion",
  "suggestion": {
    "id": "sug_1",
    "text": "Каждый день около 23:00 вы выключаете свет. Включить авто-режим night_mode?",
    "scene": "night_mode"
  }
}
```

---

## 7) AI слой (MVP rule-based)

## Правило 1: night pattern
Если 5+ дней подряд:
- в интервале `22:45 - 23:15`
- действие `light -> OFF`

Тогда создать suggestion:
- `enable_auto_night_mode`

## Правило 2: away pattern
Если часто выполняется:
- `light OFF`, `door OPEN/CLOSE`, `window CLOSE`
в течение короткого интервала,
предложить сцену `away_mode`.

---

## 8) Эндпоинты AI (MVP)

## Получить рекомендации
`GET /ai/suggestions`

Ответ:
```json
[
  {
    "id": "sug_1",
    "type": "routine",
    "text": "Каждый день в 23:00 вы выключаете свет. Включить авто-режим?",
    "scene": "night_mode"
  }
]
```

## Принять рекомендацию
`POST /ai/suggestions/{id}/accept`

Эффект:
- включить авто-сцену по расписанию

---

## 9) Что уже готово на фронте

В 3D экране уже есть вызовы для:
- индивидуального переключения light/door/window
- массового ON/OFF
- статусных индикаторов

Frontend-файлы:
- `src/screens/Room3DScreen.tsx`
- `src/store/SmartHomeContext.tsx`
- `src/api/smartHome.ts`

---

## 10) Нефункциональные требования (для 3D UX)
- API roundtrip: `< 300ms` (целевое)
- Eventual consistency: состояние UI и backend не расходится > 1s
- Для websocket: reconnect + last-state replay при переподключении

---

## 11) Минимальный чек для backend readiness
- [ ] `GET /devices` возвращает `light/door/window`
- [ ] `POST /devices/{id}/toggle` меняет состояние и возвращает новый status
- [ ] `GET /state` отдаёт агрегированное состояние комнаты
- [ ] `POST /scenes/run` поддерживает `all_on` и `all_off`
- [ ] история действий сохраняется
- [ ] `GET /ai/suggestions` отдает хотя бы rule-based подсказку
