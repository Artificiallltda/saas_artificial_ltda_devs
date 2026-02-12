import uuid
from datetime import datetime
from extensions import db


def generate_uuid():
    return str(uuid.uuid4())


class WorkspaceMember(db.Model):
    __tablename__ = "workspace_members"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    workspace_id = db.Column(db.String, db.ForeignKey("workspaces.id"), nullable=False, index=True)
    member_user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False, index=True)

    # Roles do MVP: admin | editor | reviewer
    role = db.Column(db.String(20), nullable=False, default="editor")

    # Status do vínculo (para convite futuro). No MVP usamos sempre "active".
    status = db.Column(db.String(20), nullable=False, default="active")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("workspace_id", "member_user_id", name="uq_workspace_member"),
    )

    workspace = db.relationship("Workspace", back_populates="members")
    member_user = db.relationship("User")

    def to_dict(self):
        u = self.member_user
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "user_id": self.member_user_id,
            "username": getattr(u, "username", None),
            "email": getattr(u, "email", None),
            "full_name": getattr(u, "full_name", None),
            "role": self.role,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

