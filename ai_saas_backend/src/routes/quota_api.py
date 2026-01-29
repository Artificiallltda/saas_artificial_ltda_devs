from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime
from extensions import db
from models import User
from models.chat import Chat, ChatMessage

quota_api = Blueprint("quota_api", __name__)

def _month_range_utc():
    today = datetime.utcnow().date()
    start = today.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1)
    else:
        end = start.replace(month=start.month + 1, day=1)
    return start, end

def _get_monthly_quota(user: User) -> int:
    quota = 0
    if user and user.plan and getattr(user.plan, "features", None):
        for pf in user.plan.features:
            if getattr(pf, "feature", None) and pf.feature.key == "token_quota_monthly":
                try:
                    quota = int(pf.value or "0")
                except Exception:
                    quota = 0
                break
    return quota

@quota_api.route("/status", methods=["GET"])
@jwt_required()
def quota_status():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404

    start, end = _month_range_utc()

    used = db.session.query(
        func.coalesce(func.sum(ChatMessage.total_tokens), 0)
    ).join(Chat, Chat.id == ChatMessage.chat_id
    ).filter(
        Chat.user_id == user.id,
        ChatMessage.role == "assistant",
        ChatMessage.created_at >= start.isoformat(),
        ChatMessage.created_at < end.isoformat()
    ).scalar()

    quota = _get_monthly_quota(user)

    return jsonify({
        "monthly_usage": int(used or 0),
        "monthly_quota": int(quota or 0),
        "period": {"start": start.isoformat(), "end": end.isoformat()}
    }), 200
