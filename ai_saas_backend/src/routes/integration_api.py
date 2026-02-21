from flask import Blueprint, request, jsonify
from extensions import db, jwt_required, get_jwt_identity
from models import Integration, User, GeneratedContent
from utils.feature_flags import has_plan_feature
from utils.audit_logs import log_audit_event
from datetime import datetime
import requests
from requests.auth import HTTPBasicAuth
import json

integration_api = Blueprint("integration_api", __name__)

ALLOWED_COMPANY_ADMIN_ROLES = {"owner", "admin"}


def _get_user():
    user = User.query.get(get_jwt_identity())
    if not user:
        return None, (jsonify({"error": "Usuário inválido"}), 403)

    if has_plan_feature(user, "pro_empresa"):
        return user, None

    if getattr(user, "company_id", None):
        owner = User.query.filter_by(company_id=user.company_id, company_role="owner").first()
        if owner and has_plan_feature(owner, "pro_empresa"):
            return user, None

    return None, (jsonify({"error": "Recurso não disponível no seu plano"}), 403)


def _is_company_manager(user):
    if not user:
        return False
    is_global_admin = (user.role or "").lower() == "admin"
    is_company_manager = (user.company_role or "").lower() in ALLOWED_COMPANY_ADMIN_ROLES
    return bool(is_global_admin or is_company_manager)


def _test_wordpress_connection(site_url, username, password):
    """Testa conexão com WordPress via REST API."""
    try:
        # Normalizar URL (remover trailing slash)
        site_url = site_url.rstrip("/")
        api_url = f"{site_url}/wp-json/wp/v2/users/me"
        
        response = requests.get(
            api_url,
            auth=HTTPBasicAuth(username, password),
            timeout=10,
        )
        
        if response.status_code == 200:
            user_data = response.json()
            return True, {"message": "Conexão bem-sucedida", "user": user_data.get("name", username)}
        else:
            return False, {"message": f"Erro {response.status_code}: {response.text[:200]}"}
    except requests.exceptions.RequestException as e:
        return False, {"message": f"Erro de conexão: {str(e)}"}


def _publish_to_wordpress(site_url, username, password, content_data, publish_status="draft"):
    """
    Publica conteúdo no WordPress.
    publish_status: 'draft' ou 'publish'
    """
    try:
        site_url = site_url.rstrip("/")
        api_url = f"{site_url}/wp-json/wp/v2/posts"
        
        # Preparar dados do post
        post_data = {
            "title": content_data.get("title", "Sem título"),
            "content": content_data.get("content", ""),
            "status": publish_status,
        }
        
        # Adicionar campos opcionais se fornecidos
        if content_data.get("slug"):
            post_data["slug"] = content_data["slug"]
        if content_data.get("categories"):
            post_data["categories"] = content_data["categories"]
        if content_data.get("tags"):
            post_data["tags"] = content_data["tags"]
        if content_data.get("excerpt"):
            post_data["excerpt"] = content_data["excerpt"]
        
        response = requests.post(
            api_url,
            json=post_data,
            auth=HTTPBasicAuth(username, password),
            timeout=30,
        )
        
        if response.status_code in (200, 201):
            post_data = response.json()
            return True, {
                "message": "Publicado com sucesso",
                "post_id": post_data.get("id"),
                "post_url": post_data.get("link"),
                "edit_url": post_data.get("link", "").replace("/wp-admin/", "/wp-admin/post.php?post=") if post_data.get("link") else None,
            }
        else:
            return False, {
                "message": f"Erro {response.status_code}",
                "error": response.text[:500],
            }
    except requests.exceptions.RequestException as e:
        return False, {"message": f"Erro de conexão: {str(e)}"}


@integration_api.route("", methods=["GET"])
@jwt_required()
def list_integrations():
    """Lista todas as integrações da empresa do usuário."""
    user, error = _get_user()
    if error:
        return error

    if not user.company_id:
        return jsonify({"integrations": []}), 200

    integrations = Integration.query.filter_by(company_id=user.company_id).all()
    return jsonify({
        "integrations": [i.to_dict(include_config=False) for i in integrations]
    }), 200


@integration_api.route("/wordpress", methods=["GET"])
@jwt_required()
def get_wordpress_integration():
    """Retorna a integração WordPress da empresa (se existir)."""
    user, error = _get_user()
    if error:
        return error

    if not user.company_id:
        return jsonify({"integration": None}), 200

    integration = Integration.query.filter_by(
        company_id=user.company_id,
        integration_type="wordpress"
    ).first()

    if not integration:
        return jsonify({"integration": None}), 200

    # Apenas owner/admin podem ver a config completa
    if _is_company_manager(user):
        return jsonify({"integration": integration.to_dict(include_config=True)}), 200
    else:
        return jsonify({"integration": integration.to_dict(include_config=False)}), 200


@integration_api.route("/wordpress", methods=["POST", "PUT"])
@jwt_required()
def save_wordpress_integration():
    """Cria ou atualiza a integração WordPress da empresa."""
    user, error = _get_user()
    if error:
        return error

    if not _is_company_manager(user):
        return jsonify({"error": "Apenas owner/admin podem configurar integrações"}), 403

    if not user.company_id:
        return jsonify({"error": "Usuário não pertence a uma empresa"}), 400

    data = request.get_json() or {}
    site_url = (data.get("site_url") or "").strip()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not site_url or not username or not password:
        return jsonify({"error": "site_url, username e password são obrigatórios"}), 400

    # Buscar integração existente ou criar nova
    integration = Integration.query.filter_by(
        company_id=user.company_id,
        integration_type="wordpress"
    ).first()

    if not integration:
        integration = Integration(
            company_id=user.company_id,
            integration_type="wordpress",
            is_active=True,
        )

    # Salvar configuração criptografada
    config = {
        "site_url": site_url,
        "username": username,
        "password": password,
    }
    integration.set_config(config)
    integration.is_active = True
    integration.updated_at = datetime.utcnow()

    db.session.add(integration)
    db.session.commit()

    log_audit_event(
        company_id=user.company_id,
        event_type="integration.wordpress.configured",
        actor_user_id=user.id,
        metadata={"site_url": site_url, "username": username},
    )

    return jsonify({
        "message": "Integração WordPress configurada com sucesso",
        "integration": integration.to_dict(include_config=False),
    }), 200


@integration_api.route("/wordpress/test", methods=["POST"])
@jwt_required()
def test_wordpress_connection():
    """Testa a conexão WordPress usando as credenciais salvas ou fornecidas."""
    user, error = _get_user()
    if error:
        return error

    if not _is_company_manager(user):
        return jsonify({"error": "Apenas owner/admin podem testar integrações"}), 403

    if not user.company_id:
        return jsonify({"error": "Usuário não pertence a uma empresa"}), 400

    data = request.get_json() or {}
    
    # Se credenciais foram fornecidas, usar elas; senão, buscar da integração salva
    if data.get("site_url") and data.get("username") and data.get("password"):
        site_url = data["site_url"].strip()
        username = data["username"].strip()
        password = data["password"].strip()
    else:
        integration = Integration.query.filter_by(
            company_id=user.company_id,
            integration_type="wordpress"
        ).first()
        
        if not integration:
            return jsonify({"error": "Integração WordPress não configurada"}), 404
        
        config = integration.get_config()
        site_url = config.get("site_url", "")
        username = config.get("username", "")
        password = config.get("password", "")
        
        if not site_url or not username or not password:
            return jsonify({"error": "Credenciais não encontradas"}), 400

    success, result = _test_wordpress_connection(site_url, username, password)
    
    # Atualizar status do teste na integração
    if user.company_id:
        integration = Integration.query.filter_by(
            company_id=user.company_id,
            integration_type="wordpress"
        ).first()
        if integration:
            integration.last_tested_at = datetime.utcnow()
            integration.last_tested_status = "success" if success else "failed"
            db.session.commit()

    event_type = "integration.wordpress.test.success" if success else "integration.wordpress.test.failed"
    log_audit_event(
        company_id=user.company_id,
        event_type=event_type,
        actor_user_id=user.id,
        metadata={"site_url": site_url, "success": success, "message": result.get("message", "")},
    )

    if success:
        return jsonify({"success": True, **result}), 200
    else:
        return jsonify({"success": False, **result}), 400


@integration_api.route("/wordpress/publish", methods=["POST"])
@jwt_required()
def publish_to_wordpress():
    """Publica um conteúdo aprovado no WordPress."""
    user, error = _get_user()
    if error:
        return error

    if not user.company_id:
        return jsonify({"error": "Usuário não pertence a uma empresa"}), 400

    data = request.get_json() or {}
    content_id = data.get("content_id")
    publish_status = data.get("publish_status", "draft")  # draft ou publish

    if not content_id:
        return jsonify({"error": "content_id é obrigatório"}), 400

    if publish_status not in ("draft", "publish"):
        return jsonify({"error": "publish_status deve ser 'draft' ou 'publish'"}), 400

    # Buscar conteúdo
    content = GeneratedContent.query.get(content_id)
    if not content:
        return jsonify({"error": "Conteúdo não encontrado"}), 404

    # Verificar se o conteúdo está aprovado
    if content.status != "approved":
        return jsonify({"error": "Apenas conteúdos aprovados podem ser publicados"}), 400

    # Buscar integração WordPress
    integration = Integration.query.filter_by(
        company_id=user.company_id,
        integration_type="wordpress",
        is_active=True,
    ).first()

    if not integration:
        return jsonify({"error": "Integração WordPress não configurada ou inativa"}), 404

    config = integration.get_config()
    site_url = config.get("site_url", "")
    username = config.get("username", "")
    password = config.get("password", "")

    if not site_url or not username or not password:
        return jsonify({"error": "Credenciais WordPress não encontradas"}), 400

    # Preparar dados do conteúdo
    content_data = {
        "title": data.get("title") or content.prompt[:100] or "Sem título",
        "content": content.content_data or content.prompt or "",
        "slug": data.get("slug"),
        "categories": data.get("categories", []),
        "tags": data.get("tags", []),
        "excerpt": data.get("excerpt"),
    }

    # Publicar no WordPress
    success, result = _publish_to_wordpress(site_url, username, password, content_data, publish_status)

    # Registrar na auditoria
    event_type = "integration.wordpress.publish.success" if success else "integration.wordpress.publish.failed"
    log_audit_event(
        company_id=user.company_id,
        event_type=event_type,
        actor_user_id=user.id,
        metadata={
            "content_id": content_id,
            "publish_status": publish_status,
            "post_id": result.get("post_id") if success else None,
            "error": result.get("error") if not success else None,
        },
    )

    if success:
        return jsonify({
            "message": "Conteúdo publicado com sucesso no WordPress",
            "post_id": result.get("post_id"),
            "post_url": result.get("post_url"),
            **result,
        }), 200
    else:
        return jsonify({
            "error": "Erro ao publicar no WordPress",
            **result,
        }), 400
