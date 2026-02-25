from flask import Blueprint, request, jsonify
from extensions import db, jwt_required, get_jwt_identity, redis_client
from models import AuditLog, Company, CompanyInvite, User, Workspace
from utils.feature_flags import has_plan_feature
from utils.audit_logs import log_audit_event
from routes.email_api import send_company_invite_email
import os
from datetime import datetime, timedelta
import json


company_api = Blueprint("company_api", __name__)

ALLOWED_COMPANY_ADMIN_ROLES = {"owner", "admin"}
ALLOWED_COMPANY_ROLES = {"owner", "admin", "member"}
ALLOWED_INVITE_STATUSES = {"pending", "accepted", "cancelled", "expired"}
INVITE_EXPIRATION_DAYS = 7
INVITE_COMPANY_HOURLY_LIMIT = 20
INVITE_RESEND_COOLDOWN_MINUTES = 15


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


def _is_company_manager(user):
    if not user:
        return False
    is_global_admin = (user.role or "").lower() == "admin"
    is_company_manager = (user.company_role or "").lower() in ALLOWED_COMPANY_ADMIN_ROLES
    return bool(is_global_admin or is_company_manager)


def _send_invite_email(company_id, inviter_user, to_email):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    signup_link = f"{frontend_url}/register"
    company = Company.query.get(company_id)
    return send_company_invite_email(
        to_email=to_email,
        company_name=company.name if company else "Sua empresa",
        inviter_name=inviter_user.full_name or inviter_user.email,
        signup_link=signup_link,
    )


def _default_invite_expiration():
    return datetime.utcnow() + timedelta(days=INVITE_EXPIRATION_DAYS)


def _expire_pending_invites(company_id=None):
    now = datetime.utcnow()
    q = CompanyInvite.query.filter(
        CompanyInvite.status == "pending",
        CompanyInvite.expires_at.isnot(None),
        CompanyInvite.expires_at < now,
    )
    if company_id:
        q = q.filter(CompanyInvite.company_id == company_id)

    items = q.all()
    for invite in items:
        invite.status = "expired"
    return bool(items)


def _check_invite_rate_limit(company_id):
    """
    Limite simples de convites por empresa em janela de 1 hora.
    Usa Redis, mas falha em modo 'fail-open' se o Redis não estiver disponível.
    """
    if not company_id:
        return None

    now = datetime.utcnow()
    bucket = now.strftime("%Y%m%d%H")
    key = f"company_invites:{company_id}:{bucket}"

    try:
        current_raw = redis_client.get(key)
        current = int(current_raw) if current_raw is not None else 0

        if current >= INVITE_COMPANY_HOURLY_LIMIT:
            # 429 Too Many Requests
            return (
                jsonify(
                    {
                        "error": "Limite de convites atingido",
                        "message": "Você atingiu o limite de convites por hora para esta empresa. Tente novamente em alguns minutos.",
                        "code": "invite_rate_limited",
                    }
                ),
                429,
            )

        pipe = redis_client.pipeline()
        pipe.incr(key, 1)
        if current == 0:
            pipe.expire(key, 3600)
        pipe.execute()
    except Exception:
        # Se Redis falhar, não bloqueamos o fluxo de convites.
        return None

    return None


def _check_resend_cooldown(invite):
    """
    Impede reenvio muito frequente do mesmo convite.
    Usa o campo updated_at do próprio invite como referência.
    """
    if not invite or not invite.updated_at:
        return None

    now = datetime.utcnow()
    min_interval = timedelta(minutes=INVITE_RESEND_COOLDOWN_MINUTES)
    delta = now - invite.updated_at
    if delta < min_interval:
        remaining_seconds = int((min_interval - delta).total_seconds())
        minutes = max(1, remaining_seconds // 60)
        return (
            jsonify(
                {
                    "error": "Reenvio muito frequente",
                    "message": f"Você reenviou este convite há pouco tempo. Aguarde cerca de {minutes} minuto(s) para tentar novamente.",
                    "code": "invite_resend_cooldown",
                    "retry_after_seconds": remaining_seconds,
                }
            ),
            429,
        )

    return None


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
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner/admin da empresa (ou admin global) pode listar usuários da empresa.",
            }
        ), 403

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

    MVP:
    - Apenas company owner/admin (ou admin global) pode adicionar.
    - Se usuário já estiver em outra company, bloqueia.
    - Se usuário não existir, cria convite pendente e envia email.
    """
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400

    if not _is_company_manager(user):
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner/admin da empresa (ou admin global) pode adicionar usuários na empresa.",
            }
        ), 403

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return jsonify({"error": "email inválido"}), 400

    changed = _expire_pending_invites(user.company_id)
    if changed:
        db.session.commit()

    target = User.query.filter(db.func.lower(User.email) == email).first()
    if not target:
        pending_other_company = CompanyInvite.query.filter(
            db.func.lower(CompanyInvite.invited_email) == email,
            CompanyInvite.status == "pending",
            CompanyInvite.company_id != user.company_id,
        ).first()
        if pending_other_company:
            return jsonify({"error": "Já existe convite pendente para outra empresa"}), 400

        existing_pending = CompanyInvite.query.filter(
            CompanyInvite.company_id == user.company_id,
            db.func.lower(CompanyInvite.invited_email) == email,
            CompanyInvite.status == "pending",
        ).first()
        if existing_pending:
            return jsonify({
                "message": "Convite já enviado para este email",
                "action": "invite_exists",
                "invite": existing_pending.to_dict(),
            }), 200

        # Rate limiting por empresa para novos convites
        limit_err = _check_invite_rate_limit(user.company_id)
        if limit_err:
            return limit_err

        invite = CompanyInvite(
            company_id=user.company_id,
            invited_email=email,
            invited_role="member",
            invited_by=user.id,
            status="pending",
            resend_count=0,
            expires_at=_default_invite_expiration(),
        )
        db.session.add(invite)
        log_audit_event(
            company_id=user.company_id,
            event_type="company.invite.created",
            actor_user_id=user.id,
            target_user_id=None,
            workspace_id=None,
            message=f"Convite criado para {email}",
            metadata={
                "invite_id": invite.id,
                "invited_email": email,
                "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
            },
        )
        db.session.commit()

        sent = _send_invite_email(user.company_id, user, email)

        return jsonify({
            "message": "Convite enviado. Quando o usuário se cadastrar com este email, entrará automaticamente na empresa.",
            "action": "invite_created",
            "email_sent": bool(sent),
            "invite": invite.to_dict(),
        }), 201

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
    log_audit_event(
        company_id=user.company_id,
        event_type="company.member.added",
        actor_user_id=user.id,
        target_user_id=target.id,
        workspace_id=None,
        message=f"Usuário {target.email} adicionado à empresa",
        metadata={"target_email": target.email, "company_role": target.company_role},
    )
    db.session.commit()

    return jsonify({
        "message": "Usuário adicionado à empresa",
        "action": "user_added",
        "user": {"id": target.id, "email": target.email, "company_role": target.company_role or "member"},
    }), 201


@company_api.route("/invites", methods=["GET"])
@jwt_required()
def list_company_invites():
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400

    if not _is_company_manager(user):
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner/admin da empresa (ou admin global) pode gerenciar convites da empresa.",
            }
        ), 403

    status = (request.args.get("status") or "pending").strip().lower()
    if status not in ALLOWED_INVITE_STATUSES and status != "all":
        return jsonify({"error": "status inválido. Use pending|accepted|cancelled|expired|all"}), 400

    changed = _expire_pending_invites(user.company_id)
    if changed:
        db.session.commit()

    q = CompanyInvite.query.filter_by(company_id=user.company_id)
    if status != "all":
        q = q.filter(CompanyInvite.status == status)

    invites = q.order_by(CompanyInvite.created_at.desc()).all()
    inviter_ids = [i.invited_by for i in invites if i.invited_by]
    inviters = User.query.filter(User.id.in_(inviter_ids)).all() if inviter_ids else []
    inviter_map = {u.id: {"id": u.id, "full_name": u.full_name, "email": u.email} for u in inviters}

    return jsonify([
        {
            **invite.to_dict(),
            "invited_by_user": inviter_map.get(invite.invited_by),
        }
        for invite in invites
    ]), 200


@company_api.route("/activity", methods=["GET"])
@jwt_required()
def list_company_activity():
    user, err = _get_user()
    if err:
        return err
    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400
    if not _is_company_manager(user):
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner/admin da empresa (ou admin global) pode visualizar a atividade da empresa.",
            }
        ), 403

    page = max(int(request.args.get("page", 1) or 1), 1)
    page_size = max(min(int(request.args.get("page_size", 30) or 30), 100), 1)
    actor_id = (request.args.get("actor_id") or "").strip()
    event_type = (request.args.get("event_type") or "").strip()
    workspace_id = (request.args.get("workspace_id") or "").strip()
    start_date = (request.args.get("start_date") or "").strip()
    end_date = (request.args.get("end_date") or "").strip()

    q = AuditLog.query.filter_by(company_id=user.company_id)
    if actor_id:
        q = q.filter(AuditLog.actor_user_id == actor_id)
    if event_type:
        q = q.filter(AuditLog.event_type == event_type)
    if workspace_id:
        q = q.filter(AuditLog.workspace_id == workspace_id)

    try:
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
            q = q.filter(AuditLog.created_at >= start_dt)
        if end_date:
            end_dt = datetime.fromisoformat(end_date)
            q = q.filter(AuditLog.created_at <= end_dt)
    except Exception:
        return jsonify({"error": "Período inválido. Use formato ISO (YYYY-MM-DD)."}), 400

    total = q.count()
    items = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    actor_ids = {i.actor_user_id for i in items if i.actor_user_id}
    target_ids = {i.target_user_id for i in items if i.target_user_id}
    user_ids = list(actor_ids.union(target_ids))
    users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {
        u.id: {"id": u.id, "full_name": u.full_name, "email": u.email, "username": u.username}
        for u in users
    }

    ws_ids = [i.workspace_id for i in items if i.workspace_id]
    wss = Workspace.query.filter(Workspace.id.in_(ws_ids)).all() if ws_ids else []
    ws_map = {w.id: {"id": w.id, "name": w.name} for w in wss}

    payload = []
    for item in items:
        raw = item.to_dict()
        meta = None
        try:
            meta = json.loads(raw.get("metadata_json") or "{}")
        except Exception:
            meta = {"_raw": raw.get("metadata_json")}
        payload.append({
            **raw,
            "metadata": meta,
            "actor_user": user_map.get(item.actor_user_id),
            "target_user": user_map.get(item.target_user_id),
            "workspace": ws_map.get(item.workspace_id),
        })

    return jsonify({
        "items": payload,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }), 200


@company_api.route("/activity/filters", methods=["GET"])
@jwt_required()
def list_company_activity_filters():
    user, err = _get_user()
    if err:
        return err
    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400
    if not _is_company_manager(user):
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner/admin da empresa (ou admin global) pode acessar os filtros de atividade.",
            }
        ), 403

    actions = (
        db.session.query(AuditLog.event_type)
        .filter(AuditLog.company_id == user.company_id)
        .distinct()
        .all()
    )
    users = User.query.filter_by(company_id=user.company_id).order_by(User.full_name.asc()).all()
    owner_ids = db.session.query(User.id).filter(User.company_id == user.company_id).subquery()
    workspaces = Workspace.query.filter(Workspace.user_id.in_(owner_ids)).order_by(Workspace.name.asc()).all()

    return jsonify({
        "actions": [a[0] for a in actions if a and a[0]],
        "actors": [
            {"id": u.id, "full_name": u.full_name, "email": u.email, "username": u.username}
            for u in users
        ],
        "workspaces": [{"id": w.id, "name": w.name} for w in workspaces],
    }), 200


@company_api.route("/invites/<invite_id>/resend", methods=["POST"])
@jwt_required()
def resend_company_invite(invite_id):
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400

    if not _is_company_manager(user):
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner/admin da empresa (ou admin global) pode reenviar convites.",
            }
        ), 403

    invite = CompanyInvite.query.get(invite_id)
    if not invite or invite.company_id != user.company_id:
        return jsonify({"error": "Convite não encontrado"}), 404
    if (
        invite.status == "pending"
        and invite.expires_at
        and invite.expires_at < datetime.utcnow()
    ):
        invite.status = "expired"
        db.session.commit()

    if invite.status != "pending":
        return jsonify({"error": "Apenas convites pendentes podem ser reenviados"}), 400

    cooldown_err = _check_resend_cooldown(invite)
    if cooldown_err:
        return cooldown_err

    limit_err = _check_invite_rate_limit(user.company_id)
    if limit_err:
        return limit_err

    sent = _send_invite_email(user.company_id, user, invite.invited_email)
    invite.resend_count = (invite.resend_count or 0) + 1
    invite.expires_at = _default_invite_expiration()
    log_audit_event(
        company_id=user.company_id,
        event_type="company.invite.resent",
        actor_user_id=user.id,
        target_user_id=None,
        workspace_id=None,
        message=f"Convite reenviado para {invite.invited_email}",
        metadata={
            "invite_id": invite.id,
            "invited_email": invite.invited_email,
            "resend_count": invite.resend_count,
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        },
    )
    db.session.commit()
    return jsonify({
        "message": "Convite reenviado",
        "email_sent": bool(sent),
        "invite": invite.to_dict(),
    }), 200


@company_api.route("/invites/<invite_id>", methods=["DELETE"])
@jwt_required()
def cancel_company_invite(invite_id):
    user, err = _get_user()
    if err:
        return err

    if not user.company_id:
        return jsonify({"error": "Usuário não possui company_id"}), 400

    if not _is_company_manager(user):
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner/admin da empresa (ou admin global) pode cancelar convites.",
            }
        ), 403

    invite = CompanyInvite.query.get(invite_id)
    if not invite or invite.company_id != user.company_id:
        return jsonify({"error": "Convite não encontrado"}), 404
    if (
        invite.status == "pending"
        and invite.expires_at
        and invite.expires_at < datetime.utcnow()
    ):
        invite.status = "expired"
        db.session.commit()

    if invite.status != "pending":
        return jsonify({"error": "Apenas convites pendentes podem ser cancelados"}), 400

    invite.status = "cancelled"
    log_audit_event(
        company_id=user.company_id,
        event_type="company.invite.cancelled",
        actor_user_id=user.id,
        target_user_id=None,
        workspace_id=None,
        message=f"Convite cancelado para {invite.invited_email}",
        metadata={"invite_id": invite.id, "invited_email": invite.invited_email},
    )
    db.session.commit()
    return jsonify({
        "message": "Convite cancelado",
        "invite": invite.to_dict(),
    }), 200


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
        return jsonify(
            {
                "error": "Permissão insuficiente",
                "message": "Apenas o owner da empresa (ou admin global) pode alterar papéis de usuários da empresa.",
            }
        ), 403

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

    old_role = target.company_role or "member"
    target.company_role = new_role
    log_audit_event(
        company_id=user.company_id,
        event_type="company.role.changed",
        actor_user_id=user.id,
        target_user_id=target.id,
        workspace_id=None,
        message=f"Role alterado de {old_role} para {new_role} para {target.email}",
        metadata={"old_role": old_role, "new_role": new_role, "target_email": target.email},
    )
    db.session.commit()

    return jsonify({
        "message": "Role atualizado",
        "user": {
            "id": target.id,
            "email": target.email,
            "company_role": target.company_role,
        }
    }), 200

