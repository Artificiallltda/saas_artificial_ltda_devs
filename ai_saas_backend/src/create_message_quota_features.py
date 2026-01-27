from extensions import db
from models.plan import Plan, Feature, PlanFeature, FEATURE_MONTHLY_MESSAGE_QUOTA

PLAN_QUOTAS = {
    "basico": 100,
    "premium": 500,
    "pro": 2000,
}

def get_or_create_feature():
    feature = Feature.query.filter_by(key=FEATURE_MONTHLY_MESSAGE_QUOTA).first()
    if not feature:
        feature = Feature(
            key=FEATURE_MONTHLY_MESSAGE_QUOTA,
            description="Cota mensal de mensagens do chat"
        )
        db.session.add(feature)
        db.session.commit()
    return feature

def set_plan_quota(plan_name: str, quota: int, feature: Feature):
    plan = Plan.query.filter_by(name=plan_name).first()
    if not plan:
        raise Exception(f"Plano '{plan_name}' não encontrado no banco.")

    pf = PlanFeature.query.filter_by(
        plan_id=plan.id,
        feature_id=feature.id
    ).first()

    if not pf:
        pf = PlanFeature(
            plan_id=plan.id,
            feature_id=feature.id,
            value=str(quota)
        )
        db.session.add(pf)
    else:
        pf.value = str(quota)

    db.session.commit()

def run():
    feature = get_or_create_feature()

    for plan_name, quota in PLAN_QUOTAS.items():
        set_plan_quota(plan_name, quota, feature)

    print("✅ Cotas mensais configuradas com sucesso!")

if __name__ == "__main__":
    run()
