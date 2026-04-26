from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .auth import seed_admin_if_missing
from .config import get_settings
from .db import Base, SessionLocal, engine
from .routers import auth as auth_router
from .routers import crew as crew_router
from .routers import equipment as equipment_router
from .routers import events as events_router
from .routers import summary as summary_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dev convenience: create tables if they don't exist (Alembic still authoritative for prod)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_admin_if_missing(db)
    finally:
        db.close()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


app.include_router(auth_router.router)
app.include_router(crew_router.router)
app.include_router(equipment_router.router)
app.include_router(events_router.router)
app.include_router(summary_router.router)
