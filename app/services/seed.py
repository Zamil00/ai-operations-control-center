from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RequestRecord
from app.services.audit import write_audit_log


SEED_REQUESTS = [
    {
        "request_code": "RQ-101",
        "title": "Customer support summarization workflow",
        "business_goal": "Reduce manual triage time by summarizing multi-channel support tickets.",
        "model": "gpt-4o-mini",
        "priority": "high",
        "risk_level": "medium",
        "estimated_cost": 18.5,
        "owner": "Support Ops",
        "status": "approved",
        "review_note": "Approved for limited pilot rollout.",
        "latency_ms": 1850,
    },
    {
        "request_code": "RQ-102",
        "title": "Internal policy Q&A assistant",
        "business_goal": "Help employees find policy answers without opening multiple PDFs.",
        "model": "gpt-4o-mini",
        "priority": "medium",
        "risk_level": "low",
        "estimated_cost": 7.2,
        "owner": "People Operations",
        "status": "pending",
        "review_note": None,
        "latency_ms": 1320,
    },
    {
        "request_code": "RQ-103",
        "title": "Proposal drafting assistant",
        "business_goal": "Accelerate first-draft proposal creation for enterprise deals.",
        "model": "gpt-4.1-mini",
        "priority": "high",
        "risk_level": "high",
        "estimated_cost": 28.0,
        "owner": "Sales Enablement",
        "status": "rejected",
        "review_note": "Rejected until data handling controls are clarified.",
        "latency_ms": 2440,
    },
]


def seed_demo_data(db: Session) -> None:
    existing = db.scalar(select(RequestRecord.id).limit(1))
    if existing:
        return

    for item in SEED_REQUESTS:
        record = RequestRecord(**item)
        db.add(record)
    db.commit()

    for item in SEED_REQUESTS:
        write_audit_log(
            db,
            actor="System Seeder",
            action="request_created",
            request_code=item["request_code"],
            result="success",
            details=f"Seeded request with status={item['status']}",
        )
