import uuid
from datetime import datetime
from extensions import db
import json
from cryptography.fernet import Fernet
import os


def generate_uuid():
    return str(uuid.uuid4())


class Integration(db.Model):
    __tablename__ = "integrations"

    id = db.Column(db.String, primary_key=True, default=generate_uuid)
    company_id = db.Column(db.String, db.ForeignKey("companies.id"), nullable=False, index=True)
    integration_type = db.Column(db.String(50), nullable=False, index=True)  # wordpress, webhook, etc.
    config_encrypted = db.Column(db.Text, nullable=False)  # JSON criptografado
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    last_tested_at = db.Column(db.DateTime, nullable=True)
    last_tested_status = db.Column(db.String(20), nullable=True)  # success | failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship("Company", foreign_keys=[company_id], lazy=True)

    __table_args__ = (
        db.UniqueConstraint("company_id", "integration_type", name="uq_company_integration_type"),
    )

    def _get_encryption_key(self):
        """Gera ou recupera a chave de criptografia do ambiente."""
        key = os.getenv("INTEGRATION_ENCRYPTION_KEY")
        if not key:
            # Em dev, usar uma chave fixa (NÃO usar em produção sem variável de ambiente)
            # Para dev, vamos usar base64 encoding simples ao invés de criptografia real
            return None
        else:
            key = key.encode() if isinstance(key, str) else key
            return Fernet(key)

    def set_config(self, config_dict):
        """Criptografa e armazena a configuração."""
        fernet = self._get_encryption_key()
        json_str = json.dumps(config_dict)
        if fernet:
            encrypted = fernet.encrypt(json_str.encode())
            self.config_encrypted = encrypted.decode()
        else:
            # Em dev, apenas base64 encode (não é seguro, mas funciona para desenvolvimento)
            import base64
            self.config_encrypted = base64.b64encode(json_str.encode()).decode()

    def get_config(self):
        """Descriptografa e retorna a configuração."""
        if not self.config_encrypted:
            return {}
        try:
            fernet = self._get_encryption_key()
            if fernet:
                decrypted = fernet.decrypt(self.config_encrypted.encode())
                return json.loads(decrypted.decode())
            else:
                # Em dev, apenas base64 decode
                import base64
                decrypted = base64.b64decode(self.config_encrypted.encode())
                return json.loads(decrypted.decode())
        except Exception:
            return {}

    def to_dict(self, include_config=False):
        """Retorna dict com dados da integração. Por padrão, não expõe config sensível."""
        data = {
            "id": self.id,
            "company_id": self.company_id,
            "integration_type": self.integration_type,
            "is_active": self.is_active,
            "last_tested_at": self.last_tested_at.isoformat() if self.last_tested_at else None,
            "last_tested_status": self.last_tested_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_config:
            data["config"] = self.get_config()
        return data
