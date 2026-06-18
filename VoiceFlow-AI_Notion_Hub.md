# 🚀 VoiceFlow-AI Project Hub

Welcome to your **VoiceFlow-AI** Project Wiki! This page is fully optimized for import into **Notion**. It serves as a central source of truth for developer onboarding, architecture tracking, database schemas, and features.

---

## 📋 Project Overview
**VoiceFlow-AI** (featuring the **Saarthi** AI assistant) is a production-ready system consisting of:
*   **FastAPI Backend**: Built with Python, Speech-to-Text translation services, and SMTP mail dispatchers.
*   **Next.js Frontend**: Built with React, Tailwind CSS, and optimized glassmorphic dashboards.
*   **Database (BaaS)**: Powered by **InsForge** (PostgreSQL-based database, RLS policies, authentications, and file storage).

---

## 🛠️ Architecture & Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15, React, Lucide Icons | Responsive chat interfaces & dashboard analytics |
| **Backend** | FastAPI, Python 3.10+ | REST endpoints, speech transcription & business logic |
| **Database** | Postgres (InsForge BaaS) | Relational database storage, Auth & RLS policies |
| **AI Integration** | Google Gemini 2.0 / OpenRouter | Email generation, translation & chat completions |
| **Migrations** | Alembic | Version-controlled DB schemas |

---

## 🗄️ Database Schema Reference

### 1. `profiles` Table
Stores supplemental user information synchronized with auth records.
*   `id` (*UUID*, Primary Key) - Matches `auth.users(id)`.
*   `full_name` (*Text*) - Display name of the user.

### 2. `conversation` Table
Tracks user chat sessions.
*   `id` (*UUID*, Primary Key) - Unique identifier.
*   `user_id` (*UUID*) - Foreign key referencing the active user profile.
*   `title` (*Text*) - Automatically generated conversation title based on the first prompt.
*   `created_at`/`updated_at` (*Timestamp*) - Record audit trails.

### 3. `message` Table
Stores messages inside each conversation.
*   `id` (*UUID*, Primary Key)
*   `conversation_id` (*UUID*) - Foreign key referencing `conversation(id)`.
*   `sender` (*Text*) - Identifies the author (`user` or `assistant`).
*   `content` (*Text*) - The text body.
*   `timestamp` (*Timestamp*)

### 4. `email` Table
Contains generated drafts and outgoing emails.
*   `id` (*UUID*, Primary Key)
*   `user_id` (*UUID*) - Foreign key referencing the sender.
*   `recipient` (*Text*) - Recipient address.
*   `subject` (*Text*) - Email subject line.
*   `body` (*Text*) - Main body copy.
*   `status` (*Text*) - Draft status (e.g. `draft`, `sent`).

---

## 🤖 Saarthi: The AI Assistant
The active agent has been customized as **Saarthi** (replacing the default generic titles). 
*   **Default Prompt**: *"You are Saarthi, a helpful, professional AI assistant built by Bharath Moogi. Your primary goal is to help users write, edit, and improve emails, as well as answer general questions."*
*   **Capabilities**:
    *   **Conversational Chat**: Interactive interface remembering historical contexts.
    *   **Speech-to-Text**: Voice-command translation and dictation features.
    *   **Email Builder**: Direct conversion of AI conversational text into formatted email drafts.

---

## ⚙️ Quick Start Setup

### 1. Local Backend Setup
```bash
# Initialize virtual environment
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start local server
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install packages
npm install

# Run dev server
npm run dev
```

---

## ☁️ Deployment Guide
1.  **Database**: Create a project on **Supabase** or use your **InsForge** dashboard and retrieve the connection string.
2.  **FastAPI Backend**: Deploy on **Railway** using the provided `Dockerfile` and `railway.toml`. Add environment variables for `DATABASE_URL` and `GEMINI_API_KEY`.
3.  **Frontend**: Deploy on **Vercel** with the root directory set to `frontend` and pointing to the Railway server URL via the environment variable `NEXT_PUBLIC_API_URL`.

---

*Hub page auto-generated on June 18, 2026.*
