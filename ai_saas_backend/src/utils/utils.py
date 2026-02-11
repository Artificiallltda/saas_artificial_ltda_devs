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
        raise RevokedTokenError(
            "Serviço de autenticação temporariamente indisponível.",
            jwt_data=jwt_payload,
        )
    return token_in_redis is not None


def create_default_plans():
    # Recursos disponíveis
    features = {
        "generate_text": "Geração com todos os modelos",
        "attach_files": "Anexar arquivos",
        "limit_chats": "Limite de chats",
        "limit_messages": "Limite de mensagens por chat",
        # Cota mensal de tokens por plano (número inteiro em tokens, armazenado como string)
        "token_quota_monthly": "Cota mensal de tokens por usuário",
        "customization": "Personalização das respostas (temperatura)",
        "generate_image": "Geração de imagem",
        "generate_video": "Geração de vídeo",
        "download_bot": "Freepik/Envato Artificiall",
        # Pro Empresa (SEO + colaboração + integrações)
        "pro_empresa": "Acesso ao Pro Empresa",
        "seo_keyword_research": "SEO: Pesquisa de palavras‑chave",
        "seo_briefing": "SEO: Briefing SEO automático",
        "seo_realtime_score": "SEO: Score em tempo real no editor",
        "collab_workspaces": "Colaboração: Workspaces de equipe",
        "collab_approval_flow": "Colaboração: Fluxo simples de aprovação",
        "cms_integration_wordpress": "Integração: Publicar no WordPress",
        "crm_integration_basic": "Integração: CRM/Webhook básico",
        "analytics_usage_basic": "Analytics: Uso do plano (básico)",
        # Acessos por modelo (Gemini)
        "gemini_25_pro": "Acesso ao Gemini 2.5 Pro",
        "gemini_25_flash": "Acesso ao Gemini 2.5 Flash",
        "gemini_25_flash_lite": "Acesso ao Gemini 2.5 Flash Lite",
        "gemini_30": "Acesso ao Gemini 3.0",
    }

    # Garante os registros de Feature
    feature_objs = {}
    for key, desc in features.items():
        f = Feature.query.filter_by(key=key).first()
        if not f:
            f = Feature(key=key, description=desc)
            db.session.add(f)
            db.session.flush()
        feature_objs[key] = f

    # Planos base
    plan_names = ["Grátis", "Básico", "Pro", "Premium", "Pro Empresa", "Bot"]

    # Conjunto das chaves Gemini (para gating por plano)
    GEMINI_KEYS = {"gemini_25_pro", "gemini_25_flash", "gemini_25_flash_lite", "gemini_30"}
    PRO_EMPRESA_KEYS = {
        "pro_empresa",
        "seo_keyword_research",
        "seo_briefing",
        "seo_realtime_score",
        "collab_workspaces",
        "collab_approval_flow",
        "cms_integration_wordpress",
        "crm_integration_basic",
        "analytics_usage_basic",
    }

    # Regras explícitas por plano (evita "vazar" feature nova para plano antigo)
    TOKEN_QUOTA = {
        "Grátis": str(30000),        # 30k
        "Básico": str(300000),       # 300k
        "Premium": str(3000000),     # 3M
        "Pro": str(15000000),        # 15M
        "Pro Empresa": str(50000000) # 50M (ajuste depois conforme pricing)
    }

    # Features booleanas básicas por plano (fora Gemini/Pro Empresa)
    BOOL_FEATURES = {
        "Grátis": {
            "generate_text",
            "generate_image",
            "limit_chats",
            "limit_messages",
        },
        "Básico": {
            "generate_text",
            "limit_chats",
            "limit_messages",
        },
        "Premium": {
            "generate_text",
            "generate_image",
            "attach_files",
            "customization",
            "limit_chats",
            "limit_messages",
            # manter download bot em planos pagos (Bot = apenas isso; outros podem também)
            "download_bot",
        },
        "Pro": {
            "generate_text",
            "generate_image",
            "generate_video",
            "attach_files",
            "customization",
            "limit_chats",
            "limit_messages",
            "download_bot",
        },
        "Pro Empresa": {
            "generate_text",
            "generate_image",
            "generate_video",
            "attach_files",
            "customization",
            "limit_chats",
            "limit_messages",
            "download_bot",
        },
        "Bot": {
            "download_bot",
        },
    }

    for name in plan_names:
        plan = Plan.query.filter_by(name=name).first()
        if not plan:
            if name == "Bot" and Plan.query.get(4) is None:
                plan = Plan(id=4, name=name)
            else:
                plan = Plan(name=name)
            db.session.add(plan)
            db.session.flush()

        for key, f in feature_objs.items():
            existing = PlanFeature.query.filter_by(plan_id=plan.id, feature_id=f.id).first()

            # Regras por plano (sempre aplicadas, atualizando se já existir)
            if plan.name == "Bot":
                if key == "download_bot":
                    value = "true"
                elif key == "token_quota_monthly":
                    value = "0"
                else:
                    value = "false"

            elif key == "token_quota_monthly":
                value = TOKEN_QUOTA.get(plan.name, "0")

            # Pro Empresa (o bloco inteiro) só pode ficar ativo no plano Pro Empresa
            elif key in PRO_EMPRESA_KEYS:
                value = "true" if plan.name == "Pro Empresa" else "false"

            # Chaves Gemini
            elif key in GEMINI_KEYS:
                if plan.name == "Básico":
                    # Básico: apenas Gemini 2.5 Flash Lite (conforme regra do produto)
                    allow = key in {"gemini_25_flash_lite"}
                elif plan.name in ("Premium", "Pro", "Pro Empresa"):
                    # Premium/Pro/Pro Empresa: acesso total às chaves Gemini
                    allow = True
                else:
                    allow = False
                value = "true" if allow else "false"

            # Demais features booleanas (explicitamente por plano)
            else:
                enabled = key in BOOL_FEATURES.get(plan.name, set())
                value = "true" if enabled else "false"

            if not existing:
                pf = PlanFeature(plan_id=plan.id, feature_id=f.id, value=value)
                db.session.add(pf)
            else:
                if existing.value != value:
                    existing.value = value

    db.session.commit()