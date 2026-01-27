from datetime import datetime
from extensions import db

# ajuste este import conforme a estrutura do seu projeto
from models.plan import FEATURE_MONTHLY_MESSAGE_QUOTA  # noqa: F401


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(30), nullable=False, unique=True)
    email = db.Column(db.String, nullable=False, unique=True)
    password = db.Column(db.String, nullable=False)
    role = db.Column(db.String, default="user")

    # payment_method = db.Column(db.String, nullable=True)
    perfil_photo = db.Column(db.String, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), default=1)
    plan = db.relationship("Plan", back_populates="users")

    def get_monthly_message_quota(self, default: int = 0) -> int:
        """
        Retorna a cota mensal de mensagens do usuário com base no plano.
        - Usa a feature 'monthly_message_quota'
        - Se não houver plano/feature, retorna default
        """
        if not self.plan:
            return default

        # O Plan já tem o método get_monthly_message_quota(default=...)
        try:
            return self.plan.get_monthly_message_quota(default=default)
        except Exception:
            # segurança extra para não quebrar o chat por configuração inválida
            return default

    @property
    def monthly_message_quota(self) -> int:
        """
        Atalho para uso no restante do sistema.
        """
        return self.get_monthly_message_quota(default=0)
