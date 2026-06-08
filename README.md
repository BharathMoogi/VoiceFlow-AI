# VoiceFlow-AI

A production-ready FastAPI backend with Speech-to-Text, Gemini AI email generation, and SMTP sending.

---

## Project Structure

```
VoiceFlow-AI/
├── alembic/                    # Database migrations
│   ├── versions/               # Individual migration files
│   │   └── 001_initial.py      # Initial schema (user, conversation, message, email)
│   ├── env.py                  # Alembic runtime configuration
│   └── script.py.mako          # Migration file template
├── alembic.ini                 # Alembic settings
├── app/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── auth.py         # POST /auth/login, POST /auth/register
│   │   │   ├── conversation.py # Conversation CRUD
│   │   │   ├── email.py        # Email CRUD + AI generate + SMTP send
│   │   │   └── speech.py       # POST /speech/transcribe[-and-generate]
│   │   ├── deps.py             # JWT dependency injection
│   │   └── api.py              # Router aggregator
│   ├── core/
│   │   ├── config.py           # Pydantic Settings (env vars)
│   │   └── security.py         # Password hashing, JWT creation
│   ├── db/
│   │   ├── base.py             # Imports all models for Alembic autogenerate
│   │   ├── base_class.py       # Declarative base with auto __tablename__
│   │   └── session.py          # Async SQLAlchemy engine + session factory
│   ├── models/                 # SQLAlchemy ORM models
│   ├── schemas/                # Pydantic request/response schemas
│   └── services/               # Business logic
│       ├── ai_service.py       # Gemini AI integration
│       ├── email_service.py    # Email CRUD service
│       ├── mail_service.py     # Async SMTP sending
│       └── speech_service.py   # Provider-based Speech-to-Text
├── .env                        # Local secrets (git-ignored)
├── .env.example                # Environment variable template
└── requirements.txt
```

---

## Setup

### 1. Clone and create virtual environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=voiceflow_db

# JWT
SECRET_KEY=your_secret_key_here

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
SMTP_USE_TLS=True
SMTP_USE_SSL=False
```

### 4. Create the PostgreSQL database

```sql
CREATE DATABASE voiceflow_db;
```

---

## Database Migrations (Alembic)

All database schema changes are managed through Alembic migrations.

### Apply all migrations (fresh database)

```bash
alembic upgrade head
```

### Check current migration status

```bash
alembic current
```

### View migration history

```bash
alembic history --verbose
```

### Create a new migration after changing a model

```bash
# Auto-generate from model changes
alembic revision --autogenerate -m "describe your change here"

# Then apply it
alembic upgrade head
```

### Rollback migrations

```bash
# Roll back one step
alembic downgrade -1

# Roll back to a specific revision
alembic downgrade 001_initial

# Roll back everything (wipe schema)
alembic downgrade base
```

### Generate SQL script (offline / CI review)

```bash
alembic upgrade head --sql > migration.sql
```

---

## Running the Application

```bash
uvicorn app.main:app --reload
```

API docs available at: **http://localhost:8000/docs**

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login/access-token` | Obtain JWT token |
| `GET`  | `/conversations/` | List conversations |
| `POST` | `/emails/` | Create email draft |
| `GET`  | `/emails/` | List all emails |
| `GET`  | `/emails/{id}` | Get email by ID |
| `POST` | `/emails/generate` | AI-generate email from prompt |
| `POST` | `/emails/{id}/send` | Send draft via SMTP |
| `POST` | `/speech/transcribe` | Transcribe audio → text |
| `POST` | `/speech/transcribe-and-generate` | Audio → text → AI email → saved draft |

---

## Switching Speech-to-Text Provider

The `SpeechService` uses a provider pattern. To activate a real provider:

```python
# In app/main.py startup
from app.services.speech_service import speech_service, WhisperProvider
speech_service.set_provider(WhisperProvider())
```

Available providers: `MockSpeechProvider` (default), `WhisperProvider`, `GoogleSpeechProvider`.
