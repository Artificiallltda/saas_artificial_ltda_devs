from flask import Blueprint, request, jsonify
from extensions import db, jwt_required, get_jwt_identity
from models import Workspace, WorkspaceMember, User, Project
from utils.feature_flags import has_plan_feature
from sqlalchemy import or_

workspace_api = Blueprint("workspace_api", __name__)


ALLOWED_MEMBER_ROLES = {"admin", "editor", "reviewer"}
ALLOWED_COMPANY_MANAGERS = {"owner", "admin"}


def _require_user_and_feature():
    user = User.query.get(get_jwt_identity())
    if not user:
        return None, (jsonify({"error": "Usuário inválido"}), 403)

    # Fonte da verdade preferida: o próprio plano do usuário
    if has_plan_feature(user, "collab_workspaces"):
        return user, None

    # Fallback B2B: se o usuário pertence a uma company, herdamos a permissão do owner da company.
    # Isso permite que membros/admins da empresa usem Workspaces mesmo que o plano individual não tenha a flag.
    if getattr(user, "company_id", None):
        owner = User.query.filter_by(company_id=user.company_id, company_role="owner").first()
        if owner and has_plan_feature(owner, "collab_workspaces"):
            return user, None

    return None, (jsonify({"error": "Recurso não disponível no seu plano"}), 403)
    return user, None


def _get_workspace_or_404(workspace_id: str):
    ws = Workspace.query.get(workspace_id)
    if not ws:
        return None, (jsonify({"error": "Workspace não encontrado"}), 404)
    return ws, None


def _is_workspace_member(user_id: str, workspace_id: str) -> bool:
    return (
        WorkspaceMember.query.filter_by(workspace_id=workspace_id, member_user_id=user_id, status="active")
        .first()
        is not None
    )


def _is_company_manager_for_workspace(user: User, ws: Workspace) -> bool:
    """
    Pode "administrar" recursos do workspace (membros/roles):
    - admin global do sistema, ou
    - owner do workspace, ou
    - company_role owner/admin na mesma company do owner do workspace
    """
    if not user or not ws:
        return False

    if (getattr(user, "role", "") or "").lower() == "admin":
        return True

    if ws.user_id == user.id:
        return True

    owner = User.query.get(ws.user_id)
    if not owner:
        return False

    if not owner.company_id or not user.company_id:
        return False

    if owner.company_id != user.company_id:
        return False

    return (getattr(user, "company_role", "") or "").lower() in ALLOWED_COMPANY_MANAGERS


@workspace_api.route("/", methods=["GET"])
@jwt_required()
def list_workspaces():
    user, err = _require_user_and_feature()
    if err:
        return err

    # Owner vê os seus + workspaces em que ele é membro (para colaboração)
    member_ws_ids = (
        db.session.query(WorkspaceMember.workspace_id)
        .filter_by(member_user_id=user.id, status="active")
        .subquery()
    )
    base_filter = or_(Workspace.user_id == user.id, Workspace.id.in_(member_ws_ids))

    # Company admin/owner: vê também todos os workspaces cujo owner está na mesma company
    if getattr(user, "company_id", None) and (getattr(user, "company_role", "") or "").lower() in ALLOWED_COMPANY_MANAGERS:
        company_user_ids = db.session.query(User.id).filter_by(company_id=user.company_id).subquery()
        base_filter = or_(base_filter, Workspace.user_id.in_(company_user_ids))

    items = Workspace.query.filter(base_filter).order_by(Workspace.created_at.desc()).distinct().all()
    return jsonify([w.to_dict() for w in items]), 200


@workspace_api.route("/", methods=["POST"])
@jwt_required()
def create_workspace():
    user, err = _require_user_and_feature()
    if err:
        return err

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
    user, err = _require_user_and_feature()
    if err:
        return err

    ws, err = _get_workspace_or_404(workspace_id)
    if err:
        return err
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
    user, err = _require_user_and_feature()
    if err:
        return err

    ws, err = _get_workspace_or_404(workspace_id)
    if err:
        return err
    if ws.user_id != user.id:
        return jsonify({"error": "Acesso negado"}), 403

    # desvincula projetos
    for p in Project.query.filter_by(workspace_id=ws.id).all():
        p.workspace_id = None
    db.session.delete(ws)
    db.session.commit()
    return jsonify({"message": "Workspace removido"}), 200


@workspace_api.route("/<workspace_id>/projects", methods=["GET"])
@jwt_required()
def list_workspace_projects(workspace_id):
    user, err = _require_user_and_feature()
    if err:
        return err

    ws, err = _get_workspace_or_404(workspace_id)
    if err:
        return err

    if ws.user_id != user.id and not _is_workspace_member(user.id, ws.id) and not _is_company_manager_for_workspace(user, ws):
        return jsonify({"error": "Acesso negado"}), 403

    projects = Project.query.filter_by(workspace_id=ws.id).order_by(Project.updated_at.desc()).all()
    return jsonify([p.to_dict() for p in projects]), 200


# ============================
# Membros & Papéis (MVP)
# ============================


@workspace_api.route("/<workspace_id>/members", methods=["GET"])
@jwt_required()
def list_workspace_members(workspace_id):
    user, err = _require_user_and_feature()
    if err:
        return err

    ws, err = _get_workspace_or_404(workspace_id)
    if err:
        return err

    # qualquer membro (ou owner) pode ver a lista
    if ws.user_id != user.id and not _is_workspace_member(user.id, ws.id) and not _is_company_manager_for_workspace(user, ws):
        return jsonify({"error": "Acesso negado"}), 403

    owner = User.query.get(ws.user_id)
    members = WorkspaceMember.query.filter_by(workspace_id=ws.id, status="active").order_by(WorkspaceMember.created_at.asc()).all()

    payload = []
    if owner:
        payload.append({
            "user_id": owner.id,
            "username": owner.username,
            "email": owner.email,
            "full_name": owner.full_name,
            "role": "owner",
            "status": "active",
            "is_owner": True,
        })

    payload.extend([{**m.to_dict(), "is_owner": False} for m in members])
    return jsonify(payload), 200


@workspace_api.route("/<workspace_id>/members", methods=["POST"])
@jwt_required()
def add_workspace_member(workspace_id):
    user, err = _require_user_and_feature()
    if err:
        return err

    ws, err = _get_workspace_or_404(workspace_id)
    if err:
        return err

    # owner do workspace OU admin/owner da company do workspace
    if not _is_company_manager_for_workspace(user, ws):
        return jsonify({"error": "Acesso negado"}), 403

    owner = User.query.get(ws.user_id)
    if not owner:
        return jsonify({"error": "Owner do workspace não encontrado"}), 404

    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or "").strip()
    role = (data.get("role") or "editor").strip().lower()

    if not identifier:
        return jsonify({"error": "identifier é obrigatório (email ou username)"}), 400
    if role not in ALLOWED_MEMBER_ROLES:
        return jsonify({"error": "role inválido (use admin|editor|reviewer)"}), 400

    if "@" in identifier:
        target = User.query.filter_by(email=identifier).first()
    else:
        target = User.query.filter_by(username=identifier).first()

    if not target:
        return jsonify({"error": "Usuário não encontrado"}), 404
    if target.id == ws.user_id:
        return jsonify({"error": "O owner já faz parte do workspace"}), 400

    # B2B MVP: ao adicionar no workspace, garante que o usuário pertence à mesma company do owner.
    # Isso permite listar usuários "da empresa" sem vazar usuários do sistema.
    if owner.company_id:
        if target.company_id and target.company_id != owner.company_id:
            return jsonify({"error": "Usuário pertence a outra empresa"}), 400
        if not target.company_id:
            target.company_id = owner.company_id
            target.company_role = target.company_role or "member"

    existing = WorkspaceMember.query.filter_by(workspace_id=ws.id, member_user_id=target.id).first()
    if existing and existing.status == "active":
        return jsonify({"error": "Usuário já é membro deste workspace"}), 400

    if existing:
        existing.status = "active"
        existing.role = role
    else:
        member = WorkspaceMember(workspace_id=ws.id, member_user_id=target.id, role=role, status="active")
        db.session.add(member)

    db.session.commit()
    return jsonify({"message": "Membro adicionado", "member": {"user_id": target.id, "role": role}}), 201


@workspace_api.route("/<workspace_id>/members/<member_user_id>", methods=["PATCH"])
@jwt_required()
def update_workspace_member_role(workspace_id, member_user_id):
    user, err = _require_user_and_feature()
    if err:
        return err

    ws, err = _get_workspace_or_404(workspace_id)
    if err:
        return err

    if not _is_company_manager_for_workspace(user, ws):
        return jsonify({"error": "Acesso negado"}), 403

    data = request.get_json(silent=True) or {}
    role = (data.get("role") or "").strip().lower()
    if role not in ALLOWED_MEMBER_ROLES:
        return jsonify({"error": "role inválido (use admin|editor|reviewer)"}), 400

    m = WorkspaceMember.query.filter_by(workspace_id=ws.id, member_user_id=member_user_id, status="active").first()
    if not m:
        return jsonify({"error": "Membro não encontrado"}), 404

    m.role = role
    db.session.commit()
    return jsonify({"message": "Papel atualizado", "member": m.to_dict()}), 200


@workspace_api.route("/<workspace_id>/members/<member_user_id>", methods=["DELETE"])
@jwt_required()
def remove_workspace_member(workspace_id, member_user_id):
    user, err = _require_user_and_feature()
    if err:
        return err

    ws, err = _get_workspace_or_404(workspace_id)
    if err:
        return err

    if not _is_company_manager_for_workspace(user, ws):
        return jsonify({"error": "Acesso negado"}), 403

    m = WorkspaceMember.query.filter_by(workspace_id=ws.id, member_user_id=member_user_id).first()
    if not m:
        return jsonify({"error": "Membro não encontrado"}), 404

    db.session.delete(m)
    db.session.commit()
    return jsonify({"message": "Membro removido"}), 200

