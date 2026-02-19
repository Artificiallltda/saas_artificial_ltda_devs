import uuid
from datetime import datetime
from extensions import db


def generate_uuid():
    return str(uuid.uuid4())


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    company_id = db.Column(db.String, db.ForeignKey("companies.id"), nullable=False, index=True)
    workspace_id = db.Column(db.String, db.ForeignKey("workspaces.id"), nullable=True, index=True)
    actor_user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=True, index=True)
    target_user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=True, index=True)
    event_type = db.Column(db.String(80), nullable=False, index=True)
    message = db.Column(db.String(255), nullable=True)
    metadata_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "workspace_id": self.workspace_id,
            "actor_user_id": self.actor_user_id,
            "target_user_id": self.target_user_id,
            "event_type": self.event_type,
            "message": self.message,
            "metadata_json": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

