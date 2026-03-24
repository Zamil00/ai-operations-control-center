from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from app.database import get_db
from app.models import AuditLog
from app.schemas import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogResponse])
def list_audit_logs(db: Session = Depends(get_db)) -> list[AuditLogResponse]:
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc())
    return list(db.scalars(stmt).all())
