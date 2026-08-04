import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.schema import User, Conversation, Message, Vocabulary, GrammarCorrection, Feedback
from app.services.nlp_service import nlp_service

class DatabaseService:
    @staticmethod
    async def get_or_create_user(db: AsyncSession, username: str, email: str, native_lang: str = "en") -> User:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalars().first()
        if not user:
            user = User(username=username, email=email, native_language=native_lang, target_languages=["es", "fr", "ja", "hi"])
            db.add(user)
            await db.commit()
            await db.refresh(user)
        return user

    @staticmethod
    async def create_conversation(db: AsyncSession, user_id: int, title: str, target_lang: str, mode: str = "general") -> Conversation:
        conv = Conversation(user_id=user_id, title=title, target_language=target_lang, mode=mode)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    @staticmethod
    async def list_conversations(db: AsyncSession, user_id: int) -> List[Conversation]:
        result = await db.execute(select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.created_at.desc()))
        return result.scalars().all()

    @staticmethod
    async def add_message(db: AsyncSession, conversation_id: int, sender: str, content: str, detected_lang: str = None, translation: str = None, audio_url: str = None) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            sender=sender,
            content=content,
            detected_language=detected_lang,
            translation=translation,
            audio_url=audio_url
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    @staticmethod
    async def get_messages(db: AsyncSession, conversation_id: int) -> List[Message]:
        result = await db.execute(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()))
        return result.scalars().all()

    @staticmethod
    async def add_vocabulary(db: AsyncSession, user_id: int, word: str, language: str, translation: str, example: str = None, notes: str = None) -> Vocabulary:
        vocab = Vocabulary(
            user_id=user_id,
            word=word,
            language=language,
            translation=translation,
            example_sentence=example,
            context_notes=notes,
            next_review_at=datetime.datetime.utcnow()
        )
        db.add(vocab)
        await db.commit()
        await db.refresh(vocab)
        return vocab

    @staticmethod
    async def review_vocabulary(db: AsyncSession, vocab_id: int, quality_score: int) -> Vocabulary:
        result = await db.execute(select(Vocabulary).where(Vocabulary.id == vocab_id))
        vocab = result.scalars().first()
        if vocab:
            rep, interval, ef, next_review = nlp_service.compute_sm2_review(
                quality_score, vocab.repetition_count, vocab.interval, vocab.ease_factor
            )
            vocab.repetition_count = rep
            vocab.interval = interval
            vocab.ease_factor = ef
            vocab.last_reviewed_at = datetime.datetime.utcnow()
            vocab.next_review_at = next_review
            await db.commit()
            await db.refresh(vocab)
        return vocab

    @staticmethod
    async def list_due_vocabulary(db: AsyncSession, user_id: int, language: str = None) -> List[Vocabulary]:
        query = select(Vocabulary).where(Vocabulary.user_id == user_id, Vocabulary.next_review_at <= datetime.datetime.utcnow())
        if language:
            query = query.where(Vocabulary.language == language)
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def log_grammar_correction(db: AsyncSession, user_id: int, language: str, original: str, corrected: str, explanation: str, category: str = None) -> GrammarCorrection:
        correction = GrammarCorrection(
            user_id=user_id,
            language=language,
            original_text=original,
            corrected_text=corrected,
            explanation=explanation,
            rule_category=category
        )
        db.add(correction)
        await db.commit()
        await db.refresh(correction)
        return correction

    @staticmethod
    async def add_feedback(db: AsyncSession, message_id: int, user_id: int, rating: int, feedback_text: str = None, suggestion: str = None) -> Feedback:
        fb = Feedback(
            message_id=message_id,
            user_id=user_id,
            rating=rating,
            feedback_text=feedback_text,
            suggested_correction=suggestion
        )
        db.add(fb)
        await db.commit()
        await db.refresh(fb)
        return fb

db_service = DatabaseService()
