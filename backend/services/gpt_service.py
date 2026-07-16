"""AI-backed and local-fallback learning-content generation for Prism."""

import os

from openai import AsyncOpenAI


DEFAULT_MODEL = "gpt-4.1-mini"


async def generate_learning_content(
    text: str, reading_level: str, task: str
) -> str:
    """Generate a learning aid, using a local response without an API key."""
    api_key = os.getenv("OPENAI_API_KEY")

    if api_key:
        client = AsyncOpenAI(api_key=api_key)
        response = await client.responses.create(
            model=os.getenv("OPENAI_MODEL", DEFAULT_MODEL),
            instructions=(
                "You are Prism, a patient educational assistant. "
                f"{task} the user's selected text for a {reading_level}-level "
                "learner. Use simple language, preserve accuracy, and keep the "
                "answer concise."
            ),
            input=text,
        )
        return response.output_text

    return _placeholder_content(text, reading_level, task)


async def generate_explanation(text: str, reading_level: str) -> str:
    """Create a clear explanation."""
    return await generate_learning_content(text, reading_level, "Explain")


async def generate_eli5(text: str) -> str:
    """Create an especially simple explanation."""
    return await generate_learning_content(text, "young child", "Explain like I am five")


async def generate_quiz(text: str, reading_level: str) -> str:
    """Create a short quiz."""
    return await generate_learning_content(text, reading_level, "Create a two-question quiz about")


async def generate_examples(text: str, reading_level: str) -> str:
    """Create relatable examples."""
    return await generate_learning_content(text, reading_level, "Give two relatable examples of")


async def generate_prerequisites(text: str, reading_level: str) -> str:
    """Identify needed background knowledge."""
    return await generate_learning_content(
        text, reading_level, "List the key ideas to know before learning"
    )


def _placeholder_content(text: str, reading_level: str, task: str) -> str:
    """Return useful local content when AI generation is not configured."""
    subject = text.strip()

    if task == "Explain":
        return f"Here is a {reading_level}-level explanation: {subject}"
    if task == "Explain like I am five":
        return f"Think of it like this: {subject} It is a big idea made from smaller parts working together."
    if task.startswith("Create a two-question quiz"):
        return (
            f"1. In your own words, what is the main idea of: '{subject}'?\n"
            "2. What is one real-world situation where this idea could matter?"
        )
    if task.startswith("Give two relatable examples"):
        return (
            f"Example 1: Imagine explaining '{subject}' to a classmate with a familiar daily situation.\n"
            "Example 2: Notice a similar pattern in something you use or observe every day."
        )
    return (
        "Before learning this, it helps to know:\n"
        "1. The basic meaning of the important words.\n"
        "2. The cause-and-effect relationships described in the text.\n"
        f"3. The central idea: {subject}"
    )
