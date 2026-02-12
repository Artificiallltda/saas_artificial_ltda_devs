from datetime import datetime
from extensions import db

class User(db.Model):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.String, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(30), nullable=False, unique=True)
    email = db.Column(db.String, nullable=False, unique=True)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.String, default="user")
    #payment_method = db.Column(db.String, nullable=True)
    perfil_photo = db.Column(db.String, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), default=1)
    plan = db.relationship("Plan", back_populates="users")

    # B2B / Company (MVP)
    company_id = db.Column(db.String, db.ForeignKey("companies.id"), nullable=True, index=True)
    # owner | admin | member (apenas dentro da company)
    company_role = db.Column(db.String(20), nullable=True)
    company = db.relationship(
        "Company",
        back_populates="users",
        foreign_keys=[company_id],
    )