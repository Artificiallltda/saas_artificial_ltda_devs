from datetime import datetime
from extensions import db


# Chave padrão para a feature de cota mensal por mensagens
FEATURE_MONTHLY_MESSAGE_QUOTA = "monthly_message_quota"


class Plan(db.Model):
    __tablename__ = "plans"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    users = db.relationship("User", back_populates="plan", lazy=True)
    features = db.relationship(
        "PlanFeature",
        back_populates="plan",
        cascade="all, delete-orphan"
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def get_feature_value(self, key: str, default: str | None = None) -> str | None:
        """
        Retorna o value (string) da feature associada ao plano.
        Ex.: key="monthly_message_quota" -> "1000"
        """
        if not self.features:
            return default

        for pf in self.features:
            # pf.feature pode estar lazy; cuidamos com segurança
            if pf.feature and pf.feature.key == key:
                return pf.value

        return default

    def get_monthly_message_quota(self, default: int = 0) -> int:
        """
        Retorna a cota mensal de mensagens do plano (int).
        - Usa a feature FEATURE_MONTHLY_MESSAGE_QUOTA
        - Se não existir ou for inválida, retorna default
        """
        raw = self.get_feature_value(FEATURE_MONTHLY_MESSAGE_QUOTA, None)
        if raw is None:
            return default

        raw = str(raw).strip()
        if raw == "":
            return default

        # Se alguém configurar "true/false" por engano
        if raw.lower() in ("true", "false"):
            return default

        try:
            value = int(raw)
            return max(value, 0)
        except ValueError:
            return default


class Feature(db.Model):
    __tablename__ = "features"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    plans = db.relationship(
        "PlanFeature",
        back_populates="feature",
        cascade="all, delete-orphan"
    )


class PlanFeature(db.Model):
    __tablename__ = "plan_features"

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey("plans.id"), nullable=False)
    feature_id = db.Column(db.Integer, db.ForeignKey("features.id"), nullable=False)

    # pode ser "true", "false", "10", "1000" etc
    value = db.Column(db.String(100), nullable=False, default="false")

    plan = db.relationship("Plan", back_populates="features")
    feature = db.relationship("Feature", back_populates="plans")
