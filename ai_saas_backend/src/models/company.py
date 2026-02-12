import uuid
from datetime import datetime
from extensions import db


def generate_uuid():
    return str(uuid.uuid4())


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    name = db.Column(db.String(160), nullable=False)
    created_by = db.Column(db.String, db.ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    # - users: membros da company (users.company_id -> companies.id)
    users = db.relationship(
        "User",
        back_populates="company",
        foreign_keys="User.company_id",
        lazy=True,
    )

    # - creator: usuário que bootstrapou a company (companies.created_by -> users.id)
    creator = db.relationship(
        "User",
        foreign_keys=[created_by],
        lazy=True,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

