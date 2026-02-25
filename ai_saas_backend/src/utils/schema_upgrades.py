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

        # users.company_id + users.company_role (B2B MVP)
        if "users" in tables:
            _add_column_if_missing("users", "company_id", _type_string(), None)
            _add_column_if_missing("users", "company_role", "VARCHAR(20)", None)

        # company_invites (convites de empresa)
        if "company_invites" not in tables:
            dt = _type_datetime()
            db.session.execute(text(f"""
                CREATE TABLE company_invites (
                    id VARCHAR PRIMARY KEY,
                    company_id VARCHAR NOT NULL,
                    invited_email VARCHAR(255) NOT NULL,
                    invited_role VARCHAR(20) NOT NULL DEFAULT 'member',
                    invited_by VARCHAR NOT NULL,
                    accepted_user_id VARCHAR NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    resend_count INTEGER NOT NULL DEFAULT 0,
                    expires_at {dt} NULL,
                    accepted_at {dt} NULL,
                    created_at {dt} NULL,
                    updated_at {dt} NULL
                )
            """))
            db.session.execute(text("CREATE INDEX idx_company_invites_company_id ON company_invites(company_id)"))
            db.session.execute(text("CREATE INDEX idx_company_invites_invited_email ON company_invites(invited_email)"))
            db.session.execute(text("CREATE INDEX idx_company_invites_invited_by ON company_invites(invited_by)"))
            db.session.execute(text("CREATE INDEX idx_company_invites_accepted_user_id ON company_invites(accepted_user_id)"))
        else:
            _add_column_if_missing("company_invites", "resend_count", "INTEGER", "0")
            _add_column_if_missing("company_invites", "expires_at", _type_datetime(), None)
            # Remove restrição única que impedia vários cancelados por mesmo email (corrige 500 ao cancelar convite)
            dialect = _dialect_name()
            try:
                if dialect in ("postgresql", "postgres"):
                    db.session.execute(text(
                        "ALTER TABLE company_invites DROP CONSTRAINT IF EXISTS uq_company_invites_company_email_status"
                    ))
                else:
                    db.session.execute(text("DROP INDEX IF EXISTS uq_company_invites_company_email_status"))
            except Exception:
                pass

        # audit_logs (auditoria Pro Empresa)
        if "audit_logs" not in tables:
            dt = _type_datetime()
            db.session.execute(text(f"""
                CREATE TABLE audit_logs (
                    id VARCHAR PRIMARY KEY,
                    company_id VARCHAR NOT NULL,
                    workspace_id VARCHAR NULL,
                    actor_user_id VARCHAR NULL,
                    target_user_id VARCHAR NULL,
                    event_type VARCHAR(80) NOT NULL,
                    message VARCHAR(255) NULL,
                    metadata_json TEXT NULL,
                    created_at {dt} NULL
                )
            """))
            db.session.execute(text("CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id)"))
            db.session.execute(text("CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id)"))
            db.session.execute(text("CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id)"))
            db.session.execute(text("CREATE INDEX idx_audit_logs_target_user_id ON audit_logs(target_user_id)"))
            db.session.execute(text("CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type)"))
            db.session.execute(text("CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at)"))

        # integrations (integrações WordPress, webhook, etc.)
        if "integrations" not in tables:
            dt = _type_datetime()
            db.session.execute(text(f"""
                CREATE TABLE integrations (
                    id VARCHAR PRIMARY KEY,
                    company_id VARCHAR NOT NULL,
                    integration_type VARCHAR(50) NOT NULL,
                    config_encrypted TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    last_tested_at {dt} NULL,
                    last_tested_status VARCHAR(20) NULL,
                    created_at {dt} NULL,
                    updated_at {dt} NULL,
                    FOREIGN KEY (company_id) REFERENCES companies (id)
                )
            """))
            db.session.execute(text("CREATE UNIQUE INDEX uq_company_integration_type ON integrations(company_id, integration_type)"))
            db.session.execute(text("CREATE INDEX idx_integrations_company_id ON integrations(company_id)"))
            db.session.execute(text("CREATE INDEX idx_integrations_type ON integrations(integration_type)"))

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

