from datetime import datetime
from extensions import db


class MonthlyUsage(db.Model):
    __tablename__ = "monthly_usage"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.String,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # formato: YYYY-MM (ex.: "2026-01")
    month_key = db.Column(db.String(7), nullable=False, index=True)

    used_messages = db.Column(db.Integer, nullable=False, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "month_key",
            name="uq_monthly_usage_user_month"
        ),
    )

    @staticmethod
    def current_month_key() -> str:
        """
        Retorna o mês corrente no formato YYYY-MM
        """
        return datetime.utcnow().strftime("%Y-%m")

    @classmethod
    def get_or_create_for_current_month(cls, user_id: str):
        """
        Busca ou cria o registro de uso do mês atual para o usuário.
        """
        month_key = cls.current_month_key()

        usage = cls.query.filter_by(
            user_id=user_id,
            month_key=month_key
        ).first()

        if not usage:
            usage = cls(
                user_id=user_id,
                month_key=month_key,
                used_messages=0
            )
            db.session.add(usage)
            db.session.commit()

        return usage

    def increment_messages(self, amount: int = 1):
        """
        Incrementa o uso de mensagens (commit incluso).
        """
        if amount <= 0:
            return

        self.used_messages += amount
        db.session.commit()

    def percent_used(self, quota: int) -> float:
        """
        Retorna percentual usado (0.0 a 1.0).
        """
        if quota <= 0:
            return 1.0
        return min(self.used_messages / quota, 1.0)
