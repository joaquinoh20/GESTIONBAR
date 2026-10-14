from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import analytics, auth, customers, insights, products, reports, sales
from .core.config import settings
from .core.database import Base, SessionLocal, engine
from . import models  # noqa: F401  (registra las tablas)
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.SEED_ON_START:
        with SessionLocal() as db:
            seed(db)
    yield


app = FastAPI(
    title="SalesIA Enterprise API",
    version="1.0.0",
    description="Gestión de ventas y analítica estadística (media, mediana, variables aleatorias, Bayes).",
    lifespan=lifespan,
)

# Configuración de CORS permitiendo dominios de Vercel y comodín
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers tanto con prefijo /api como en la raíz
# para garantizar compatibilidad con /auth/login y /api/auth/login
api = APIRouter(prefix="/api")
for module in (auth, customers, products, sales, analytics, insights, reports):
    api.include_router(module.router)
    app.include_router(module.router)

app.include_router(api)


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Error interno del servidor"})


@app.get("/health", tags=["Sistema"])
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}