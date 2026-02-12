from flask import Blueprint, request, jsonify
from extensions import bcrypt, db, jwt_required, get_jwt_identity
from models import (
    User, Chat, ChatMessage, ChatAttachment,
    Project, GeneratedContent, Notification
)
from dotenv import load_dotenv
import re

user_api = Blueprint("user_api", __name__)
load_dotenv()

# Obter dados do usuário
@user_api.route("/<user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user:
        return jsonify({"error": "Usuário inválido"}), 403

    if current_user.id != user_id and current_user.role != "admin":
        return jsonify({"error": "Acesso negado"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    user_data = {
        "id": user.id,
        "full_name": user.full_name,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "perfil_photo": user.perfil_photo,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat()
    }
    return jsonify(user_data), 200

# Atualizar usuário
@user_api.route("/<user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    if not current_user:
        return jsonify({"error": "Usuário inválido"}), 403

    if current_user.id != user_id and current_user.role != "admin":
        return jsonify({"error": "Acesso negado"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON vazio"}), 400

    if current_user.role != "admin":
        for campo_restrito in ["role", "plan_id", "is_active"]:
            data.pop(campo_restrito, None)

    if "full_name" in data:
        user.full_name = data["full_name"]

    if "username" in data:
        if User.query.filter(User.username == data["username"], User.id != user.id).first():
            return jsonify({"error": "Username já existe"}), 400
        user.username = data["username"]

    if "email" in data:
        if User.query.filter(User.email == data["email"], User.id != user.id).first():
            return jsonify({"error": "Email já cadastrado"}), 400
        user.email = data["email"]

    if "password" in data:
        password = data["password"]
        pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$"
        if not re.match(pattern, password):
            return jsonify({
                "error": "Senha precisa ter pelo menos 8 caracteres, uma maiúscula, uma minúscula, um número e um caractere especial"
            }), 400
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        user.password = hashed_password

    db.session.commit()
    return jsonify({"message": "Usuário atualizado com sucesso"}), 200

# Deletar usuário
@user_api.route("/<user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        return jsonify({"error": "Usuário inválido"}), 403

    if current_user.id != user_id and current_user.role != "admin":
        return jsonify({"error": "Acesso negado"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    try:
        # ============================
        # Deletar chats, mensagens e attachments
        # ============================
        for chat in user.chats:
            for message in chat.messages:
                for attachment in message.attachments:
                    db.session.delete(attachment)
                db.session.delete(message)
            db.session.delete(chat)

        # ============================
        # Deletar projects e associações com generated contents
        # ============================
        for project in user.projects:
            project.contents = []  # remove associações
            db.session.delete(project)

        # ============================
        # Deletar generated contents
        # ============================
        for content in user.generated_contents:
            content.projects = []  # remove associações
            db.session.delete(content)

        # ============================
        # Deletar notifications
        # ============================
        for notification in user.notifications:
            db.session.delete(notification)

        # ============================
        # Deletar usuário
        # ============================
        db.session.delete(user)
        db.session.commit()

        return jsonify({"message": "Usuário excluído com sucesso"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Erro ao excluir usuário", "details": str(e)}), 500

# Dados do usuário logado
@user_api.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    # Serialização segura para frontend
    plan_data = None
    if user.plan:
        plan_data = {
            "id": user.plan.id,
            "name": user.plan.name,
            "features": [
                {
                    "key": pf.feature.key if pf.feature else "",
                    "description": pf.feature.description if pf.feature else "",
                    "value": pf.value
                }
                for pf in user.plan.features
            ]
        }

    return jsonify({
        "id": user.id,
        "full_name": user.full_name,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "company_id": getattr(user, "company_id", None),
        "company_role": getattr(user, "company_role", None),
        "plan": plan_data,
        "perfil_photo": user.perfil_photo,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
        "updated_at": user.updated_at.isoformat()
    }), 200
