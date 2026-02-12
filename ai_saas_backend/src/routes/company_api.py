from flask import Blueprint, request, jsonify
from extensions import db, jwt_required, get_jwt_identity
from models import Company, User
from utils.feature_flags import has_plan_feature


company_api = Blueprint("company_api", __name__)

ALLOWED_COMPANY_ADMIN_ROLES = {"owner", "admin"}


def _get_user():
    user = User.query.get(get_jwt_identity())
    if not user:
        return None, (jsonify({"error": "Usuário inválido"}), 403)
    if not has_plan_feature(user, "pro_empresa"):
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

