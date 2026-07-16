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


class PrerequisiteConcept(BaseModel):
    """One ordered, interactive step in a learner's preparation path."""

    id: str = Field(..., description="Stable identifier for UI state and progress.")
    title: str
    description: str
    position: int = Field(..., ge=1, description="One-based order in the path.")
    depends_on: list[str] = Field(
        default_factory=list,
        description="IDs of concepts that should be learned first.",
    )


class LearningPathResponse(BaseModel):
    """Structured prerequisites that a frontend can render as a learning path."""

    topic: str
    reading_level: str
    concepts: list[PrerequisiteConcept]
