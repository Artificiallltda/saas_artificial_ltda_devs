from flask import Blueprint, jsonify, request
from extensions import db, bcrypt, jwt_required
from utils import admin_required
from models import User, Plan
from models.chat import Chat, ChatMessage
from sqlalchemy import func
from datetime import datetime, timedelta
import uuid, os, re

admin_api = Blueprint("admin_api", __name__)

@admin_api.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def list_all_users():
    users = User.query.all()
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "full_name": user.full_name,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "plan": {
                "id": user.plan.id,
                "name": user.plan.name
            } if user.plan else None,
            "is_active": user.is_active
        })
    return jsonify(result)

@admin_api.route("/users", methods=["POST"])
@jwt_required()
@admin_required
def create_user():
    data = request.form
    file = request.files.get("perfil_photo")

    def is_valid_email(email):
        return re.match(r"[^@]+@[^@]+\.[^@]+", email)

    if not is_valid_email(data.get("email", "")):
        return jsonify({"error": "Email inválido"}), 400

    required_fields = ["full_name", "username", "email", "password", "plan_id"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Campo obrigatório: {field}"}), 400

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username já existe"}), 400
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email já cadastrado"}), 400

    password = data["password"]
    pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$"
    if not re.match(pattern, password):
        return jsonify({"error": "Senha fraca"}), 400

    perfil_path = None
    if file:
        filename = f"{uuid.uuid4()}_{file.filename}"
        upload_dir = os.path.join("static", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        perfil_path = filepath

    plan = Plan.query.get(data["plan_id"])
    if not plan:
        return jsonify({"error": "Plano inválido"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")

    new_user = User(
        id=str(uuid.uuid4()),
        full_name=data["full_name"],
        username=data["username"],
        email=data["email"],
        password=hashed_password,
        perfil_photo=perfil_path,
        #payment_method=data.get("payment_method"),
        plan=plan,
        role=data.get("role", "user")
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Usuário criado com sucesso", "id": new_user.id}), 201


@admin_api.route("/users/<user_id>/plan", methods=["PUT"])
@jwt_required()
@admin_required
def update_user_plan(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    data = request.get_json()
    if not data or "plan_id" not in data:
        return jsonify({"error": "plan_id obrigatório"}), 400

    plan = Plan.query.get(data["plan_id"])
    if not plan:
        return jsonify({"error": "Plano inválido"}), 404

    user.plan = plan
    db.session.commit()
    return jsonify({
        "message": "Plano atualizado com sucesso",
        "user": {
            "id": user.id,
            "plan": user.plan.name
        }
    }), 200

# Atualização de role comentada, mas is_active continua funcionando
@admin_api.route("/users/<user_id>/status", methods=["PUT"])
@jwt_required()
@admin_required
def update_user_status(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON vazio"}), 400

    # if "role" in data:
    #     user.role = data["role"]

    if "is_active" in data:
        user.is_active = data["is_active"]

    db.session.commit()
    return jsonify({
        "message": "Usuário atualizado com sucesso",
        "user": {
            "id": user.id,
            "is_active": user.is_active
        }
    }), 200

# Relatório de uso de tokens por usuário, com filtros de período e modelo
@admin_api.route("/usage", methods=["GET"])
@jwt_required()
@admin_required
def usage_report():
    # Restringe ao admin específico, se desejado
    current_user_id = getattr(jwt_required, "__wrapped__", None) and None  # dummy, já validado
    # Validação adicional: admin fixo "GeanSantos" (opcional forte)
    # Busca o usuário autenticado pelo JWT
    from flask_jwt_extended import get_jwt_identity
    uid = get_jwt_identity()
    me = User.query.get(uid)
    if not me or me.username != "GeanSantos":
        return jsonify({"error": "Acesso restrito ao administrador responsável"}), 403

    start = request.args.get("start")
    end = request.args.get("end")
    model = request.args.get("model")

    # Se período não informado, considera mês corrente (UTC)
    if not start or not end:
        today = datetime.utcnow().date()
        month_start = today.replace(day=1)
        # próximo mês
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1, day=1)
        # usa ISO date
        start = start or month_start.isoformat()
        end = end or next_month.isoformat()

    q = db.session.query(
        Chat.user_id.label("user_id"),
        func.coalesce(func.sum(ChatMessage.prompt_tokens), 0).label("prompt_tokens"),
        func.coalesce(func.sum(ChatMessage.completion_tokens), 0).label("completion_tokens"),
        func.coalesce(func.sum(ChatMessage.total_tokens), 0).label("total_tokens"),
    ).join(ChatMessage, Chat.id == ChatMessage.chat_id
    ).filter(ChatMessage.role == "assistant")

    if start:
        q = q.filter(ChatMessage.created_at >= start)
    if end:
        q = q.filter(ChatMessage.created_at <= end)
    if model:
        q = q.filter(ChatMessage.model_used == model)

    q = q.group_by(Chat.user_id).order_by(func.sum(ChatMessage.total_tokens).desc())
    rows = q.all()

    users = {}
    if rows:
        ids = [r.user_id for r in rows]
        for u in User.query.filter(User.id.in_(ids)).all():
            users[u.id] = u

    data = []
    for r in rows:
        u = users.get(r.user_id)
        # quota mensal por plano (Feature: token_quota_monthly)
        quota = 0
        if u and u.plan and getattr(u.plan, "features", None):
            try:
                for pf in u.plan.features:
                    if getattr(pf, "feature", None) and pf.feature.key == "token_quota_monthly":
                        quota = int(pf.value or "0")
                        break
            except Exception:
                quota = 0

        used = int(r.total_tokens or 0)
        remaining = max(quota - used, 0) if quota else None

        data.append({
            "user_id": r.user_id,
            "username": getattr(u, "username", None),
            "full_name": getattr(u, "full_name", None),
            "email": getattr(u, "email", None),
            "prompt_tokens": int(r.prompt_tokens or 0),
            "completion_tokens": int(r.completion_tokens or 0),
            "total_tokens": used,
            "quota_monthly": quota,
            "remaining_tokens": remaining,
            "period": {"start": start, "end": end},
        })
    return jsonify({"count": len(data), "results": data}), 200
