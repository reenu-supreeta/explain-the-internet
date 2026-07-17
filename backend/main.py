"""Application entry point for the Prism backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routes.explain import router as explain_router

load_dotenv()

app = FastAPI(
    title="Prism API",
    description="Backend API for the Prism educational browser extension.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(explain_router)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Report whether the API is available."""
    return {"status": "ok"}
