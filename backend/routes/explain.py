"""Routes for turning selected web content into clear explanations."""

from fastapi import APIRouter

from models import ExplainRequest, ExplainResponse
from services.gpt_service import generate_explanation


router = APIRouter(prefix="/explain", tags=["explanations"])


@router.post("", response_model=ExplainResponse)
async def explain_text(request: ExplainRequest) -> ExplainResponse:
    """Explain selected text at the learner's requested reading level."""
    explanation = await generate_explanation(request.text, request.reading_level)
    return ExplainResponse(
        explanation=explanation,
        reading_level=request.reading_level,
    )
