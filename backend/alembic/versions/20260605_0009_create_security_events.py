"""create security events

Revision ID: 20260605_0009
Revises: 20260605_0008
Create Date: 2026-06-05 15:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260605_0009"
down_revision = "20260605_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    attack_type = postgresql.ENUM(
        "MQTT_SPOOFING", "BRUTE_FORCE", "REPLAY", "DDOS", name="attack_type"
    )
    security_severity = postgresql.ENUM(
        "INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL", name="security_severity"
    )
    attack_type.create(op.get_bind(), checkfirst=True)
    security_severity.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "security_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("attack_type", attack_type, nullable=False),
        sa.Column("blocked", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("severity", security_severity, nullable=False, server_default="INFO"),
        sa.Column("target", sa.String(length=255), nullable=True),
        sa.Column("source_ip", sa.String(length=45), nullable=True),
        sa.Column("message", sa.String(length=500), nullable=False),
        sa.Column("sim_id", sa.String(length=64), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("detail", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_security_events_attack_type", "security_events", ["attack_type"])
    op.create_index("ix_security_events_sim_id", "security_events", ["sim_id"])
    op.create_index("ix_security_events_created_at", "security_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_security_events_created_at", table_name="security_events")
    op.drop_index("ix_security_events_sim_id", table_name="security_events")
    op.drop_index("ix_security_events_attack_type", table_name="security_events")
    op.drop_table("security_events")
    postgresql.ENUM(name="security_severity").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="attack_type").drop(op.get_bind(), checkfirst=True)
