import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings
from app.models.schema import Base

logger = logging.getLogger(__name__)

# Fallback to SQLite async if PostgreSQL is not available locally during testing
database_url = settings.DATABASE_URL
if "sqlite" in database_url:
    engine = create_async_engine(database_url, echo=False)
else:
    try:
        engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL ({e}). Falling back to SQLite memory.")
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
