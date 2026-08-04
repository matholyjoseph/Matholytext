from fastapi import APIRouter
from app.api.chat import router as chat_router
from app.api.translate import router as translate_router
from app.api.detector import router as detector_router
from app.api.tutoring import router as tutoring_router
from app.api.speech import router as speech_router
from app.api.feedback import router as feedback_router
from app.api.dictionary import router as dictionary_router
from app.api.corrections import router as corrections_router

api_router = APIRouter()
api_router.include_router(chat_router)
api_router.include_router(translate_router)
api_router.include_router(detector_router)
api_router.include_router(tutoring_router)
api_router.include_router(speech_router)
api_router.include_router(feedback_router)
api_router.include_router(dictionary_router)
api_router.include_router(corrections_router)
