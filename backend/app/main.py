"""
Matholy Multilingual AI Backend — Main FastAPI Application.
Initializes database, translation engine, and serves API routes.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

from app.config import settings
from app.database import init_db
from app.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Matholy AI Backend...")
    logger.info("Creating database tables...")
    await init_db()
    logger.info("Database initialized successfully.")

    # Translation engine initializes lazily via providers
    logger.info("Translation providers will initialize on first request.")

    # LLM engine loads lazily on-demand if chat endpoint is called
    logger.info("FastAPI application startup complete.")

    yield
    logger.info("Shutting down Matholy AI Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Multilingual AI Translation & Dictionary Platform — 51 Languages",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    if duration > 1.0:  # Log slow requests
        logger.warning(
            f"SLOW REQUEST: {request.method} {request.url.path} "
            f"took {duration:.2f}s (status {response.status_code})"
        )
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )


# API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "supported_languages_count": 51,
        "status": "online",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
