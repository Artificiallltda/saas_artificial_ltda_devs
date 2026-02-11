from models import User


def has_plan_feature(user: User | None, feature_key: str) -> bool:
    if not user or not user.plan or not getattr(user.plan, "features", None):
        return False
    for pf in user.plan.features:
        if getattr(pf, "feature", None) and pf.feature.key == feature_key:
            return (pf.value or "").strip().lower() == "true"
    return False

