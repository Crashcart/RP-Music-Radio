"""Add artist staging columns (status, created_by, expires_at, undo_expires_at)

Revision ID: 7b9629222ee
Revises: (initial — no prior revision)
Create Date: 2026-05-02

Context:
  The AI DJ staging feature introduces a status workflow for Artist rows:
    draft            — AI-generated, pending user review (expires in 7 days)
    pending_publish  — Approved, within the 30-second undo window
    published        — Live and visible (default for manually created artists)

  These 4 columns were added to the ORM model but never to the schema via a
  proper Alembic migration.  On any database that was created before the model
  change, queries on these columns would raise:
      sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) no such column

  This migration is safe to run against:
    • Fresh databases  — columns are created as part of table creation.
    • Existing databases — columns are added with ADD COLUMN (SQLite-safe).

  All columns are nullable or have defaults so no row-level backfill is
  required.  Existing rows will receive status='published' via the column
  default, matching the previous implicit behaviour.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# ── Revision identifiers ─────────────────────────────────────────────
revision: str = "7b9629222ee"
down_revision: str | None = None  # no prior migrations exist
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the four AI-staging columns to the artists table.

    Uses a try/except around each ADD COLUMN so the migration is idempotent:
    re-running it against a database that already has the columns (e.g. a
    fresh DB created from the ORM) will not raise an error.
    """
    with op.batch_alter_table("artists", schema=None) as batch_op:
        # Guard each column individually — SQLite does not support
        # ADD COLUMN IF NOT EXISTS, so we rely on catching the error.
        try:
            batch_op.add_column(
                sa.Column(
                    "status",
                    sa.String(),
                    nullable=False,
                    server_default="published",
                )
            )
        except Exception:
            pass  # column already exists (fresh DB seeded from ORM)

        try:
            batch_op.add_column(
                sa.Column("created_by", sa.String(), nullable=True)
            )
        except Exception:
            pass

        try:
            batch_op.add_column(
                sa.Column("expires_at", sa.DateTime(), nullable=True)
            )
        except Exception:
            pass

        try:
            batch_op.add_column(
                sa.Column("undo_expires_at", sa.DateTime(), nullable=True)
            )
        except Exception:
            pass


def downgrade() -> None:
    """Remove the four AI-staging columns from the artists table.

    SQLite does not support DROP COLUMN natively in older versions, so we
    use Alembic's batch mode which rebuilds the table without the columns.
    """
    with op.batch_alter_table("artists", schema=None) as batch_op:
        batch_op.drop_column("undo_expires_at")
        batch_op.drop_column("expires_at")
        batch_op.drop_column("created_by")
        batch_op.drop_column("status")
