from enum import Enum


class DeviceType(str, Enum):
    LIGHT = "LIGHT"
    DOOR = "DOOR"
    AC = "AC"
    TEMP = "TEMP"


class DeviceStatus(str, Enum):
    ON = "ON"
    OFF = "OFF"
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class DeviceAction(str, Enum):
    TURN_ON = "TURN_ON"
    TURN_OFF = "TURN_OFF"
    OPEN = "OPEN"
    CLOSE = "CLOSE"
