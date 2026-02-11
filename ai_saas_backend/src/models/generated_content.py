import uuid
from datetime import datetime
from extensions import db
from models.associations import project_content_association

def generate_uuid():
    return str(uuid.uuid4())

class GeneratedContent(db.Model):
    __tablename__ = "generated_contents"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String, db.ForeignKey("users.id"), nullable=False)
    
    content_type = db.Column(db.String(50), nullable=False)

    prompt = db.Column(db.Text, nullable=False)
    model_used = db.Column(db.String(100), nullable=False)
    content_data = db.Column(db.Text)
    file_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Colaboração / Aprovação (MVP)
    status = db.Column(db.String(20), nullable=False, default="draft")  # draft | in_review | approved | rejected
    submitted_at = db.Column(db.DateTime, nullable=True)
    submitted_by = db.Column(db.String, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    approved_by = db.Column(db.String, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    rejected_by = db.Column(db.String, nullable=True)

    user = db.relationship("User", backref=db.backref("generated_contents", lazy=True))
    projects = db.relationship(
        "Project",
        secondary=project_content_association,
        back_populates="contents"
    )

    __mapper_args__ = {
        "polymorphic_on": content_type,
        "polymorphic_identity": "base",
        "with_polymorphic": "*"
    }

    def __repr__(self):
        return f"<GeneratedContent {self.content_type}>"

    def base_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content_type": self.content_type,
            "prompt": self.prompt,
            "model_used": self.model_used,
            "content_data": self.content_data,
            "file_path": self.file_path,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": self.status,
            "review": {
                "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
                "submitted_by": self.submitted_by,
                "approved_at": self.approved_at.isoformat() if self.approved_at else None,
                "approved_by": self.approved_by,
                "rejected_at": self.rejected_at.isoformat() if self.rejected_at else None,
                "rejected_by": self.rejected_by,
            },
            "projects": [p.id for p in self.projects]
        }

class GeneratedTextContent(GeneratedContent):
    __tablename__ = "generated_text_contents"
    
    id = db.Column(db.String, db.ForeignKey("generated_contents.id"), primary_key=True)
    temperature = db.Column(db.Float)

    __mapper_args__ = {
        "polymorphic_identity": "text",
    }

    def to_dict(self):
        data = self.base_dict()
        data.update({"temperature": self.temperature})
        return data

class GeneratedImageContent(GeneratedContent):
    __tablename__ = "generated_image_contents"

    id = db.Column(db.String, db.ForeignKey("generated_contents.id"), primary_key=True)
    style = db.Column(db.String(50))
    ratio = db.Column(db.String(20))

    __mapper_args__ = {
        "polymorphic_identity": "image",
    }

    def to_dict(self):
        data = self.base_dict()
        data.update({
            "style": self.style,
            "ratio": self.ratio
        })
        return data

class GeneratedVideoContent(GeneratedContent):
    __tablename__ = "generated_video_contents"

    id = db.Column(db.String, db.ForeignKey("generated_contents.id"), primary_key=True)
    style = db.Column(db.String(50))
    ratio = db.Column(db.String(20))
    duration = db.Column(db.Integer)  # em segundos

    __mapper_args__ = {
        "polymorphic_identity": "video",
    }

    def to_dict(self):
        data = self.base_dict()
        data.update({
            "style": self.style,
            "ratio": self.ratio,
            "duration": self.duration
        })
        return data