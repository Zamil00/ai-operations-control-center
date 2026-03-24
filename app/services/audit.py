from sqlalchemy.orm import Session

from app.models import AuditLog


def write_audit_log(
    db: Session,
    *,
    actor: str,
    action: str,
    request_code: str,
    result: str,
    details: str | None = None,
) -> AuditLog:
    log = AuditLog(
        actor=actor,
        action=action,
        request_code=request_code,
        result=result,
        details=details,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
