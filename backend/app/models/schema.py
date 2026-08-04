import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    native_language = Column(String(10), default="en", nullable=False)
    target_languages = Column(JSON, default=list)  # list of language codes e.g. ["es", "ja", "hi"]
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    vocabularies = relationship("Vocabulary", back_populates="user", cascade="all, delete-orphan")
    corrections = relationship("GrammarCorrection", back_populates="user", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), default="New Chat")
    target_language = Column(String(10), default="en")
    mode = Column(String(20), default="general")  # 'general', 'tutor', 'translator'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    detected_language = Column(String(10), nullable=True)
    translation = Column(Text, nullable=True)
    audio_url = Column(String(500), nullable=True)
    rating = Column(Integer, default=0)  # +1 (thumbs up), -1 (thumbs down)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    feedbacks = relationship("Feedback", back_populates="message", cascade="all, delete-orphan")

class Vocabulary(Base):
    __tablename__ = "vocabularies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    word = Column(String(100), nullable=False, index=True)
    language = Column(String(10), nullable=False)
    translation = Column(String(200), nullable=False)
    example_sentence = Column(Text, nullable=True)
    context_notes = Column(Text, nullable=True)
    
    # SuperMemo SM-2 Spaced Repetition parameters
    repetition_count = Column(Integer, default=0)
    interval = Column(Integer, default=1)  # in days
    ease_factor = Column(Float, default=2.5)
    last_reviewed_at = Column(DateTime, default=datetime.datetime.utcnow)
    next_review_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="vocabularies")

class GrammarCorrection(Base):
    __tablename__ = "grammar_corrections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    language = Column(String(10), nullable=False)
    original_text = Column(Text, nullable=False)
    corrected_text = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    rule_category = Column(String(100), nullable=True)  # e.g., 'verb_conjugation', 'word_order'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="corrections")

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # +1 or -1
    feedback_text = Column(Text, nullable=True)
    suggested_correction = Column(Text, nullable=True)
    used_for_training = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    message = relationship("Message", back_populates="feedbacks")
