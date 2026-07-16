"""Routes for turning selected web content into learning aids."""

from fastapi import APIRouter

from models import ExplainRequest, ExplainResponse
from services.gpt_service import (
    generate_eli5,
    generate_examples,
    generate_explanation,
    generate_prerequisites,
    generate_quiz,
)


router = APIRouter(tags=["learning"])


@router.post("/explain", response_model=ExplainResponse)
async def explain_text(request: ExplainRequest) -> ExplainResponse:
    """Explain selected text at the learner's requested reading level."""
    explanation = await generate_explanation(request.text, request.reading_level)
    return ExplainResponse(
        explanation=explanation,
        reading_level=request.reading_level,
    )


@router.post("/eli5", response_model=ExplainResponse)
async def explain_like_im_five(request: ExplainRequest) -> ExplainResponse:
    """Explain selected text in child-friendly language."""
    return ExplainResponse(
        explanation=await generate_eli5(request.text),
        reading_level="eli5",
    )


@router.post("/quiz", response_model=ExplainResponse)
async def create_quiz(request: ExplainRequest) -> ExplainResponse:
    """Create a short knowledge-check quiz from selected text."""
    return ExplainResponse(
        explanation=await generate_quiz(request.text, request.reading_level),
        reading_level=request.reading_level,
    )


@router.post("/examples", response_model=ExplainResponse)
async def create_examples(request: ExplainRequest) -> ExplainResponse:
    """Give practical examples that make selected text easier to understand."""
    return ExplainResponse(
        explanation=await generate_examples(request.text, request.reading_level),
        reading_level=request.reading_level,
    )


@router.post("/prerequisites", response_model=ExplainResponse)
async def list_prerequisites(request: ExplainRequest) -> ExplainResponse:
    """Identify useful background knowledge for selected text."""
    return ExplainResponse(
        explanation=await generate_prerequisites(request.text, request.reading_level),
        reading_level=request.reading_level,
    )
