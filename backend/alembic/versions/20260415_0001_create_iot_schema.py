"""create iot schema

Revision ID: 20260415_0001
Revises:
Create Date: 2026-04-15 19:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260415_0001"
down_revision = None
branch_labels = None
depends_on = None


device_type_enum = postgresql.ENUM("LIGHT", "DOOR", "AC", "TEMP", name="device_type")
device_status_enum = postgresql.ENUM("ON", "OFF", "OPEN", "CLOSED", name="device_status")
device_action_enum = postgresql.ENUM("TURN_ON", "TURN_OFF", "OPEN", "CLOSE", name="device_action")


def upgrade() -> None:
    op.create_table(
        "homes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_homes_owner_id", "homes", ["owner_id"], unique=False)

    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("home_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["home_id"], ["homes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rooms_home_id", "rooms", ["home_id"], unique=False)

    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", device_type_enum, nullable=False),
        sa.Column("status", device_status_enum, nullable=False),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_devices_owner_id", "devices", ["owner_id"], unique=False)
    op.create_index("ix_devices_room_id", "devices", ["room_id"], unique=False)

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", device_action_enum, nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_events_device_id", "events", ["device_id"], unique=False)
    op.create_index("ix_events_owner_id", "events", ["owner_id"], unique=False)

    op.create_table(
        "scenarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("actions", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scenarios_owner_id", "scenarios", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_scenarios_owner_id", table_name="scenarios")
    op.drop_table("scenarios")

    op.drop_index("ix_events_owner_id", table_name="events")
    op.drop_index("ix_events_device_id", table_name="events")
    op.drop_table("events")

    op.drop_index("ix_devices_room_id", table_name="devices")
    op.drop_index("ix_devices_owner_id", table_name="devices")
    op.drop_table("devices")

    op.drop_index("ix_rooms_home_id", table_name="rooms")
    op.drop_table("rooms")

    op.drop_index("ix_homes_owner_id", table_name="homes")
    op.drop_table("homes")

    bind = op.get_bind()
    device_action_enum.drop(bind, checkfirst=True)
    device_status_enum.drop(bind, checkfirst=True)
    device_type_enum.drop(bind, checkfirst=True)
