"""Pydantic models shared by Prism API routes and services."""

from pydantic import BaseModel, Field


class ExplainRequest(BaseModel):
    """Text selected by a learner for a clearer explanation."""

    text: str = Field(..., min_length=1, max_length=10_000)
    reading_level: str = Field(default="beginner", max_length=50)


class ExplainResponse(BaseModel):
    """A learner-friendly explanation returned to the extension."""

    explanation: str
    reading_level: str
