"""add device secret hash

Revision ID: 20260513_0005
Revises: 20260513_0004
Create Date: 2026-05-13 14:00:00
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "20260513_0005"
down_revision = "20260513_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("devices", sa.Column("device_secret_hash", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("devices", "device_secret_hash")
