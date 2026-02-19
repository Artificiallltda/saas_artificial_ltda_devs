import uuid
from datetime import datetime, timedelta
from extensions import db


def generate_uuid():
    return str(uuid.uuid4())


class CompanyInvite(db.Model):
    __tablename__ = "company_invites"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    company_id = db.Column(db.String, db.ForeignKey("companies.id"), nullable=False, index=True)
    invited_email = db.Column(db.String(255), nullable=False, index=True)
    invited_role = db.Column(db.String(20), nullable=False, default="member")
    invited_by = db.Column(db.String, db.ForeignKey("users.id"), nullable=False, index=True)
    accepted_user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=True, index=True)
    status = db.Column(db.String(20), nullable=False, default="pending")  # pending | accepted | cancelled | expired
    resend_count = db.Column(db.Integer, nullable=False, default=0)
    expires_at = db.Column(db.DateTime, nullable=True, default=lambda: datetime.utcnow() + timedelta(days=7))
    accepted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint(
            "company_id",
            "invited_email",
            "status",
            name="uq_company_invites_company_email_status",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "invited_email": self.invited_email,
            "invited_role": self.invited_role,
            "invited_by": self.invited_by,
            "accepted_user_id": self.accepted_user_id,
            "status": self.status,
            "resend_count": self.resend_count or 0,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

