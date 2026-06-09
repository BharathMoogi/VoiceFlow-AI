from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router

# Logging
from app.core.logger import logger

app = FastAPI(title="VoiceFlow-AI API")

# Register middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url}")
    response = await call_next(request)
    return response

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to VoiceFlow-AI API"}
