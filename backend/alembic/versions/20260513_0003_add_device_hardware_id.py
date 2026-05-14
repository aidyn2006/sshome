"""add device hardware id

Revision ID: 20260513_0003
Revises: 20260508_0002
Create Date: 2026-05-13 12:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260513_0003"
down_revision = "20260508_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("devices", sa.Column("hardware_id", sa.String(length=64), nullable=True))
    op.create_index("ix_devices_hardware_id", "devices", ["hardware_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_devices_hardware_id", table_name="devices")
    op.drop_column("devices", "hardware_id")
