"""add device telemetry fields

Revision ID: 20260513_0004
Revises: 20260513_0003
Create Date: 2026-05-13 13:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260513_0004"
down_revision = "20260513_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("devices", sa.Column("battery_level", sa.Integer(), nullable=True))
    op.add_column("devices", sa.Column("last_error", sa.Text(), nullable=True))
    op.add_column("devices", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("devices", sa.Column("telemetry", sa.JSON(), nullable=True))

    op.execute("ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'CAMERA'")
    op.execute("ALTER TYPE device_type ADD VALUE IF NOT EXISTS 'MOTION'")


def downgrade() -> None:
    op.drop_column("devices", "telemetry")
    op.drop_column("devices", "last_seen_at")
    op.drop_column("devices", "last_error")
    op.drop_column("devices", "battery_level")
