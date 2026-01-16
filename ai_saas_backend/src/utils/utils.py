from extensions import redis_client, db
from models import User, Plan, Feature, PlanFeature

from flask_jwt_extended.exceptions import RevokedTokenError
import redis

def add_token_to_blacklist(jti, expires_in):
    redis_client.setex(jti, expires_in, "revoked")

def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    try:
        token_in_redis = redis_client.get(jti)
    except redis.exceptions.ConnectionError:
        raise RevokedTokenError("Serviço de autenticação temporariamente indisponível.", jwt_data=jwt_payload)
    return token_in_redis is not None

def create_default_plans():
    # Recursos disponíveis
    features = {
        "generate_text": "Geração com todos os modelos",
        "attach_files": "Anexar arquivos",
        "limit_chats": "Limite de chats",
        "limit_messages": "Limite de mensagens por chat",
        "customization": "Personalização das respostas (temperatura)",
        "generate_image": "Geração de imagem",
        "generate_video": "Geração de vídeo",
        # Acessos por modelo (Gemini)
        "gemini_25_pro": "Acesso ao Gemini 2.5 Pro",
        "gemini_25_flash": "Acesso ao Gemini 2.5 Flash",
        "gemini_25_flash_lite": "Acesso ao Gemini 2.5 Flash Lite",
        "gemini_30": "Acesso ao Gemini 3.0",
    }

    feature_objs = {}
    for key, desc in features.items():
        f = Feature.query.filter_by(key=key).first()
        if not f:
            f = Feature(key=key, description=desc)
            db.session.add(f)
            db.session.flush()
        feature_objs[key] = f

    # Planos
    plan_names = ["Básico", "Pro", "Premium"]

    # Conjunto das chaves Gemini
    GEMINI_KEYS = {"gemini_25_pro", "gemini_25_flash", "gemini_25_flash_lite", "gemini_30"}

    for name in plan_names:
        plan = Plan.query.filter_by(name=name).first()
        if not plan:
            plan = Plan(name=name)
            db.session.add(plan)
            db.session.flush()

        for key, f in feature_objs.items():
            existing = PlanFeature.query.filter_by(plan_id=plan.id, feature_id=f.id).first()
            if not existing:
                # Regras por plano
                if key in GEMINI_KEYS:
                    if plan.name == "Básico":
                        allow = key in {"gemini_25_pro", "gemini_25_flash_lite"}
                    elif plan.name in ("Pro", "Premium"):
                        allow = key in {"gemini_30", "gemini_25_flash"}
                    else:
                        allow = False
                    value = "true" if allow else "false"
                else:
                    # Regra anterior mantida para as outras features
                    value = "false" if (plan.name == "Básico" and key == "generate_text") else "true"

                pf = PlanFeature(plan_id=plan.id, feature_id=f.id, value=value)
                db.session.add(pf)

    db.session.commit()