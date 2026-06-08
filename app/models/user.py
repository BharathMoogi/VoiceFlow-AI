from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    conversations = relationship("Conversation", back_populates="user")
    emails = relationship("Email", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user")
