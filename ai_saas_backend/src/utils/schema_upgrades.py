from __future__ import annotations

from sqlalchemy import inspect, text
from extensions import db


def _dialect_name() -> str:
    try:
        return (db.engine.dialect.name or "").lower()
    except Exception:
        return ""


def _type_datetime() -> str:
    """
    SQLite aceita praticamente qualquer type name, mas Postgres não tem DATETIME.
    """
    d = _dialect_name()
    if d in ("postgresql", "postgres"):
        return "TIMESTAMP"
    return "DATETIME"


def _type_string() -> str:
    d = _dialect_name()
    if d in ("postgresql", "postgres"):
        return "VARCHAR"
    return "VARCHAR"


def _add_column_if_missing(table: str, column: str, ddl_type: str, default_sql: str | None = None):
    insp = inspect(db.engine)
    cols = {c["name"] for c in insp.get_columns(table)}
    if column in cols:
        return

    default_clause = f" DEFAULT {default_sql}" if default_sql is not None else ""
    # SQLite: ALTER TABLE ADD COLUMN supports adding nullable columns (and default)
    sql = f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}{default_clause}"
    db.session.execute(text(sql))


def run_schema_upgrades():
    """
    Upgrades simples para SQLite/dev.
    - Flask-SQLAlchemy `db.create_all()` não altera tabelas já existentes.
    - Este helper adiciona colunas novas necessárias para o MVP de colaboração.
    """
    try:
        insp = inspect(db.engine)
        tables = set(insp.get_table_names())

        # projects.workspace_id
        if "projects" in tables:
            _add_column_if_missing("projects", "workspace_id", _type_string(), None)

        # generated_contents approval fields
        if "generated_contents" in tables:
            _add_column_if_missing("generated_contents", "status", "VARCHAR(20)", "'draft'")
            _add_column_if_missing("generated_contents", "submitted_at", _type_datetime(), None)
            _add_column_if_missing("generated_contents", "submitted_by", _type_string(), None)
            _add_column_if_missing("generated_contents", "approved_at", _type_datetime(), None)
            _add_column_if_missing("generated_contents", "approved_by", _type_string(), None)
            _add_column_if_missing("generated_contents", "rejected_at", _type_datetime(), None)
            _add_column_if_missing("generated_contents", "rejected_by", _type_string(), None)

            # backfill null status
            db.session.execute(text("UPDATE generated_contents SET status='draft' WHERE status IS NULL"))

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

