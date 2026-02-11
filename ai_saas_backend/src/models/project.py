import uuid
from datetime import datetime
from extensions import db
from models.associations import project_content_association

def generate_uuid():
    return str(uuid.uuid4())

class Project(db.Model):
    __tablename__ = "projects"
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    workspace_id = db.Column(db.String, nullable=True, index=True)  # FK lógica (SQLite legacy)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    user = db.relationship("User", backref=db.backref("projects", lazy=True))
    contents = db.relationship(
        "GeneratedContent",
        secondary=project_content_association,
        back_populates="projects"
    )

    def __repr__(self):
        return f"<Project {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "contents": [c.to_dict() for c in self.contents]
        }