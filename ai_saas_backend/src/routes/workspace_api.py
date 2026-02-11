from flask import Blueprint, request, jsonify
from extensions import db, jwt_required, get_jwt_identity
from models import Workspace, User, Project
from utils.feature_flags import has_plan_feature

workspace_api = Blueprint("workspace_api", __name__)


@workspace_api.route("/", methods=["GET"])
@jwt_required()
def list_workspaces():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403
    if not has_plan_feature(user, "collab_workspaces"):
        return jsonify({"error": "Recurso não disponível no seu plano"}), 403

    items = Workspace.query.filter_by(user_id=user.id).order_by(Workspace.created_at.desc()).all()
    return jsonify([w.to_dict() for w in items]), 200


@workspace_api.route("/", methods=["POST"])
@jwt_required()
def create_workspace():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403
    if not has_plan_feature(user, "collab_workspaces"):
        return jsonify({"error": "Recurso não disponível no seu plano"}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    wtype = (data.get("type") or "team").strip()
    if not name:
        return jsonify({"error": "Nome é obrigatório"}), 400
    if wtype not in ("team", "campaign"):
        return jsonify({"error": "type inválido (use team|campaign)"}), 400

    ws = Workspace(user_id=user.id, name=name, type=wtype)
    db.session.add(ws)
    db.session.commit()
    return jsonify({"message": "Workspace criado", "workspace": ws.to_dict()}), 201


@workspace_api.route("/<workspace_id>", methods=["PUT"])
@jwt_required()
def update_workspace(workspace_id):
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403
    if not has_plan_feature(user, "collab_workspaces"):
        return jsonify({"error": "Recurso não disponível no seu plano"}), 403

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace não encontrado"}), 404
    if ws.user_id != user.id:
        return jsonify({"error": "Acesso negado"}), 403

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "Nome inválido"}), 400
        ws.name = name
    if "type" in data:
        wtype = (data.get("type") or "").strip()
        if wtype not in ("team", "campaign"):
            return jsonify({"error": "type inválido (use team|campaign)"}), 400
        ws.type = wtype

    db.session.commit()
    return jsonify({"message": "Workspace atualizado", "workspace": ws.to_dict()}), 200


@workspace_api.route("/<workspace_id>", methods=["DELETE"])
@jwt_required()
def delete_workspace(workspace_id):
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403
    if not has_plan_feature(user, "collab_workspaces"):
        return jsonify({"error": "Recurso não disponível no seu plano"}), 403

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace não encontrado"}), 404
    if ws.user_id != user.id:
        return jsonify({"error": "Acesso negado"}), 403

    # desvincula projetos
    for p in Project.query.filter_by(user_id=user.id, workspace_id=ws.id).all():
        p.workspace_id = None
    db.session.delete(ws)
    db.session.commit()
    return jsonify({"message": "Workspace removido"}), 200


@workspace_api.route("/<workspace_id>/projects", methods=["GET"])
@jwt_required()
def list_workspace_projects(workspace_id):
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({"error": "Usuário inválido"}), 403
    if not has_plan_feature(user, "collab_workspaces"):
        return jsonify({"error": "Recurso não disponível no seu plano"}), 403

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace não encontrado"}), 404
    if ws.user_id != user.id:
        return jsonify({"error": "Acesso negado"}), 403

    projects = Project.query.filter_by(user_id=user.id, workspace_id=ws.id).order_by(Project.updated_at.desc()).all()
    return jsonify([p.to_dict() for p in projects]), 200

