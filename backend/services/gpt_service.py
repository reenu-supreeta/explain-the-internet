"""Explanation-generation service.

Replace the fallback in ``generate_explanation`` with an AI provider call once
the provider and model have been selected.
"""

import os

from openai import AsyncOpenAI


DEFAULT_MODEL = "gpt-4.1-mini"


async def generate_explanation(text: str, reading_level: str) -> str:
    """Return a clear explanation of text selected in the Prism extension.

    The fallback lets the backend work before an AI provider is configured.
    """
    api_key = os.getenv("OPENAI_API_KEY")

    if api_key:
        client = AsyncOpenAI(api_key=api_key)
        response = await client.responses.create(
            model=os.getenv("OPENAI_MODEL", DEFAULT_MODEL),
            instructions=(
                "You are Prism, a patient educational assistant. Explain the "
                f"user's selected text for a {reading_level}-level learner. "
                "Use simple language, preserve accuracy, and keep the answer "
                "concise."
            ),
            input=text,
        )
        return response.output_text

    return (
        f"Here is a {reading_level}-level explanation: "
        f"{text.strip()}"
    )
