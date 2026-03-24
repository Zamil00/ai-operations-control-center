from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.routes_audit import router as audit_router
from app.api.routes_health import router as health_router
from app.api.routes_metrics import router as metrics_router
from app.api.routes_requests import router as requests_router
from app.config import get_settings
from app.database import Base, engine, SessionLocal
from app.services.seed import seed_demo_data

settings = get_settings()

Path("app/data").mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Internal platform for managing AI requests, review workflows, operational visibility, and cost/risk tracking.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.allow_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(requests_router)
app.include_router(metrics_router)
app.include_router(audit_router)


@app.get("/")
def root():
    return {
        "message": "AI Operations Control Center API is running.",
        "docs": "/docs",
        "health": "/health",
    }
