from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.models import RequestRecord
from app.schemas import RequestCreate, RequestResponse, RequestUpdate, ReviewAction
from app.services.audit import write_audit_log

router = APIRouter(prefix="/requests", tags=["requests"])


def _next_request_code(db: Session) -> str:
    records = db.scalars(select(RequestRecord.request_code)).all()
    nums = []
    for code in records:
        if code.startswith("RQ-"):
            try:
                nums.append(int(code.split("-")[1]))
            except ValueError:
                continue
    next_num = max(nums, default=100) + 1
    return f"RQ-{next_num}"


@router.get("", response_model=list[RequestResponse])
def list_requests(
    status: str | None = Query(default=None),
    owner: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[RequestResponse]:
    stmt = select(RequestRecord).order_by(RequestRecord.created_at.desc())
    if status:
        stmt = stmt.where(RequestRecord.status == status)
    if owner:
        stmt = stmt.where(RequestRecord.owner == owner)
    return list(db.scalars(stmt).all())


@router.post("", response_model=RequestResponse, status_code=201)
def create_request(payload: RequestCreate, db: Session = Depends(get_db)) -> RequestResponse:
    record = RequestRecord(
        request_code=_next_request_code(db),
        title=payload.title,
        business_goal=payload.business_goal,
        model=payload.model,
        priority=payload.priority,
        risk_level=payload.risk_level,
        estimated_cost=payload.estimated_cost,
        owner=payload.owner,
        latency_ms=payload.latency_ms,
        status="pending",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    write_audit_log(
        db,
        actor=payload.owner,
        action="request_created",
        request_code=record.request_code,
        result="success",
        details=f"Created request '{record.title}'",
    )
    return record


@router.get("/{request_id}", response_model=RequestResponse)
def get_request(request_id: int, db: Session = Depends(get_db)) -> RequestResponse:
    record = db.get(RequestRecord, request_id)
    if not record:
        raise HTTPException(status_code=404, detail="Request not found")
    return record


@router.patch("/{request_id}", response_model=RequestResponse)
def update_request(request_id: int, payload: RequestUpdate, db: Session = Depends(get_db)) -> RequestResponse:
    record = db.get(RequestRecord, request_id)
    if not record:
        raise HTTPException(status_code=404, detail="Request not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    record.updated_at = datetime.utcnow()

    db.add(record)
    db.commit()
    db.refresh(record)

    write_audit_log(
        db,
        actor=record.owner,
        action="request_updated",
        request_code=record.request_code,
        result="success",
        details="Request metadata updated",
    )
    return record


@router.post("/{request_id}/approve", response_model=RequestResponse)
def approve_request(request_id: int, payload: ReviewAction, db: Session = Depends(get_db)) -> RequestResponse:
    record = db.get(RequestRecord, request_id)
    if not record:
        raise HTTPException(status_code=404, detail="Request not found")

    record.status = "approved"
    record.review_note = payload.note
    record.updated_at = datetime.utcnow()
    db.add(record)
    db.commit()
    db.refresh(record)

    write_audit_log(
        db,
        actor=payload.actor,
        action="request_approved",
        request_code=record.request_code,
        result="success",
        details=payload.note,
    )
    return record


@router.post("/{request_id}/reject", response_model=RequestResponse)
def reject_request(request_id: int, payload: ReviewAction, db: Session = Depends(get_db)) -> RequestResponse:
    record = db.get(RequestRecord, request_id)
    if not record:
        raise HTTPException(status_code=404, detail="Request not found")

    record.status = "rejected"
    record.review_note = payload.note
    record.updated_at = datetime.utcnow()
    db.add(record)
    db.commit()
    db.refresh(record)

    write_audit_log(
        db,
        actor=payload.actor,
        action="request_rejected",
        request_code=record.request_code,
        result="success",
        details=payload.note,
    )
    return record
