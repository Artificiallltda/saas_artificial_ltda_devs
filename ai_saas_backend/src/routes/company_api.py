from flask import Blueprint, request, jsonify
from extensions import db, jwt_required, get_jwt_identity
from models import Company, User
from utils.feature_flags import has_plan_feature


company_api = Blueprint("company_api", __name__)

ALLOWED_COMPANY_ADMIN_ROLES = {"owner", "admin"}
ALLOWED_COMPANY_ROLES = {"owner", "admin", "member"}


def _get_user():
    user = User.query.get(get_jwt_identity())
    if not user:
        return None, (jsonify({"error": "Usuário inválido"}), 403)

    # Fonte da verdade preferida: o próprio plano do usuário
    if has_plan_feature(user, "pro_empresa"):
        return user, None

    # Fallback B2B: se o usuário pertence a uma company, herdamos a permissão do owner da company.
    if getattr(user, "company_id", None):
        owner = User.query.filter_by(company_id=user.company_id, company_role="owner").first()
        if owner and has_plan_feature(owner, "pro_empresa"):
            return user, None

    return None, (jsonify({"error": "Recurso não disponível no seu plano"}), 403)
    return user, None


@company_api.route("/me", methods=["GET"])
@jwt_required()
def get_my_company():
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"company": None, "company_role": None}), 200

    c = Company.query.get(user.company_id)
    return jsonify({"company": c.to_dict() if c else None, "company_role": user.company_role}), 200


@company_api.route("/bootstrap", methods=["POST"])
@jwt_required()
def bootstrap_company():
    """
    Cria uma company para o usuário Pro Empresa caso ele ainda não tenha.
    Define company_role='owner'.
    """
    user, err = _get_user()
    if err:
        return err

    if user.company_id:
        c = Company.query.get(user.company_id)
        return jsonify({"company": c.to_dict() if c else None, "company_role": user.company_role}), 200

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or f"Empresa de {user.full_name}").strip()
    if not name:
        return jsonify({"error": "name é obrigatório"}), 400

    c = Company(name=name, created_by=user.id)
    db.session.add(c)
    db.session.flush()  # obtém c.id

    user.company_id = c.id
    user.company_role = "owner"

    db.session.commit()
    return jsonify({"company": c.to_dict(), "company_role": user.company_role}), 201


@company_api.route("/users", methods=["GET"])
@jwt_required()
def list_company_users():
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400

    # Apenas admins da company (ou admin global) podem listar todos
    if (user.company_role or "").lower() not in ALLOWED_COMPANY_ADMIN_ROLES and (user.role or "").lower() != "admin":
        return jsonify({"error": "Acesso negado"}), 403

    items = User.query.filter_by(company_id=user.company_id).order_by(User.created_at.asc()).all()
    return jsonify([
        {
            "id": u.id,
            "full_name": u.full_name,
            "username": u.username,
            "email": u.email,
            "company_role": u.company_role or "member",
        }
        for u in items
    ]), 200


@company_api.route("/users", methods=["POST"])
@jwt_required()
def add_company_user_by_email():
    """
    Associa um usuário existente à company do requester via email.

    MVP (sem convites):
    - Apenas company owner/admin (ou admin global) pode adicionar.
    - Se usuário já estiver em outra company, bloqueia.
    - Se usuário não existir, retorna 404 (sem convite automático).
    """
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400

    is_global_admin = (user.role or "").lower() == "admin"
    is_company_manager = (user.company_role or "").lower() in ALLOWED_COMPANY_ADMIN_ROLES
    if not (is_company_manager or is_global_admin):
        return jsonify({"error": "Acesso negado"}), 403

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return jsonify({"error": "email inválido"}), 400

    target = User.query.filter(db.func.lower(User.email) == email).first()
    if not target:
        return jsonify({"error": "Usuário não encontrado"}), 404

    # Se já estiver na mesma empresa, ok (idempotente)
    if target.company_id == user.company_id:
        return jsonify({
            "message": "Usuário já pertence à empresa",
            "user": {"id": target.id, "email": target.email, "company_role": target.company_role or "member"},
        }), 200

    # Se já estiver em outra empresa, bloqueia
    if target.company_id and target.company_id != user.company_id:
        return jsonify({"error": "Usuário pertence a outra empresa"}), 400

    target.company_id = user.company_id
    target.company_role = target.company_role or "member"
    db.session.commit()

    return jsonify({
        "message": "Usuário adicionado à empresa",
        "user": {"id": target.id, "email": target.email, "company_role": target.company_role or "member"},
    }), 201


@company_api.route("/users/<user_id>/role", methods=["PATCH"])
@jwt_required()
def update_company_user_role(user_id):
    """
    Atualiza o company_role de um usuário da mesma empresa.

    Regras (MVP):
    - Apenas company owner (ou admin global) pode alterar roles.
    - Só permite alternar entre: admin | member (não promove para owner via API).
    - Usuário alvo deve pertencer à mesma company_id.
    """
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400

    is_global_admin = (user.role or "").lower() == "admin"
    is_company_owner = (user.company_role or "").lower() == "owner"
    if not (is_company_owner or is_global_admin):
        return jsonify({"error": "Acesso negado"}), 403

    target = User.query.get(user_id)
    if not target or target.company_id != user.company_id:
        return jsonify({"error": "Usuário não encontrado"}), 404

    data = request.get_json(silent=True) or {}
    new_role = (data.get("role") or "").strip().lower()
    if new_role not in ("admin", "member"):
        return jsonify({"error": "role inválido. Use 'admin' ou 'member'."}), 400

    # Evita perder o último owner: não permitimos editar owner via este endpoint
    if (target.company_role or "").lower() == "owner":
        return jsonify({"error": "Não é possível alterar o role do owner por este endpoint"}), 400

    target.company_role = new_role
    db.session.commit()

    return jsonify({
        "message": "Role atualizado",
        "user": {
            "id": target.id,
            "email": target.email,
            "company_role": target.company_role,
        }
    }), 200

