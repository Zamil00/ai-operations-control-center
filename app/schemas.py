from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

Priority = Literal["low", "medium", "high"]
RiskLevel = Literal["low", "medium", "high"]
RequestStatus = Literal["pending", "approved", "rejected"]


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "ai-operations-control-center"


class RequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    business_goal: str = Field(..., min_length=10)
    model: str = Field(..., min_length=2, max_length=100)
    priority: Priority = "medium"
    risk_level: RiskLevel = "medium"
    estimated_cost: float = Field(..., ge=0)
    owner: str = Field(..., min_length=2, max_length=120)
    latency_ms: int | None = Field(default=None, ge=0)


class RequestUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    business_goal: str | None = Field(default=None, min_length=10)
    model: str | None = Field(default=None, min_length=2, max_length=100)
    priority: Priority | None = None
    risk_level: RiskLevel | None = None
    estimated_cost: float | None = Field(default=None, ge=0)
    owner: str | None = Field(default=None, min_length=2, max_length=120)
    latency_ms: int | None = Field(default=None, ge=0)


class ReviewAction(BaseModel):
    actor: str = Field(..., min_length=2, max_length=120)
    note: str | None = Field(default=None, max_length=1000)


class RequestResponse(BaseModel):
    id: int
    request_code: str
    title: str
    business_goal: str
    model: str
    priority: Priority
    risk_level: RiskLevel
    estimated_cost: float
    owner: str
    status: RequestStatus
    review_note: str | None = None
    latency_ms: int | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    actor: str
    action: str
    request_code: str
    result: str
    details: str | None
    timestamp: datetime

    class Config:
        from_attributes = True


class MetricsSummary(BaseModel):
    total_requests: int
    pending_reviews: int
    approved_requests: int
    rejected_requests: int
    average_latency_ms: float
    total_estimated_cost: float


class DashboardResponse(BaseModel):
    metrics: MetricsSummary
    recent_requests: list[RequestResponse]
    recent_audit_logs: list[AuditLogResponse]
