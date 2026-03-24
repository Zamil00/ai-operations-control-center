from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from app.database import get_db
from app.models import AuditLog, RequestRecord
from app.schemas import AuditLogResponse, DashboardResponse, MetricsSummary, RequestResponse

router = APIRouter(prefix="/metrics", tags=["metrics"])


def build_metrics(db: Session) -> MetricsSummary:
    total_requests = db.scalar(select(func.count(RequestRecord.id))) or 0
    pending_reviews = db.scalar(select(func.count(RequestRecord.id)).where(RequestRecord.status == "pending")) or 0
    approved_requests = db.scalar(select(func.count(RequestRecord.id)).where(RequestRecord.status == "approved")) or 0
    rejected_requests = db.scalar(select(func.count(RequestRecord.id)).where(RequestRecord.status == "rejected")) or 0
    average_latency_ms = db.scalar(select(func.avg(RequestRecord.latency_ms))) or 0.0
    total_estimated_cost = db.scalar(select(func.sum(RequestRecord.estimated_cost))) or 0.0
    return MetricsSummary(
        total_requests=total_requests,
        pending_reviews=pending_reviews,
        approved_requests=approved_requests,
        rejected_requests=rejected_requests,
        average_latency_ms=round(float(average_latency_ms), 2),
        total_estimated_cost=round(float(total_estimated_cost), 2),
    )


@router.get("/summary", response_model=MetricsSummary)
def get_metrics_summary(db: Session = Depends(get_db)) -> MetricsSummary:
    return build_metrics(db)


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db)) -> DashboardResponse:
    recent_requests = list(
        db.scalars(select(RequestRecord).order_by(RequestRecord.updated_at.desc()).limit(8)).all()
    )
    recent_logs = list(
        db.scalars(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(8)).all()
    )
    return DashboardResponse(
        metrics=build_metrics(db),
        recent_requests=[RequestResponse.model_validate(item) for item in recent_requests],
        recent_audit_logs=[AuditLogResponse.model_validate(item) for item in recent_logs],
    )
