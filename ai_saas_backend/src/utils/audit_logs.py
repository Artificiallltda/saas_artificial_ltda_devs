import json
from models import AuditLog
from extensions import db


def log_audit_event(
    company_id,
    event_type,
    actor_user_id=None,
    target_user_id=None,
    workspace_id=None,
    message=None,
    metadata=None,
):
    if not company_id or not event_type:
        return None

    payload = None
    if metadata is not None:
        try:
            payload = json.dumps(metadata, ensure_ascii=False)
        except Exception:
            payload = json.dumps({"_raw": str(metadata)}, ensure_ascii=False)

    item = AuditLog(
        company_id=company_id,
        workspace_id=workspace_id,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        event_type=event_type,
        message=message,
        metadata_json=payload,
    )
    db.session.add(item)
    return item

