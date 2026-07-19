"""AI-backed and local-fallback learning-content generation for Prism."""

import os
import re

from openai import AsyncOpenAI

from models import PrerequisiteConcept

DEFAULT_MODEL = "gpt-4.1-mini"
PREREQUISITE_TASK = "Identify the concrete prerequisites for"

FALLBACK_PREREQUISITES = {
    "rnn": [
        ("Neural Networks", "Before learning RNNs, understand neural networks because an RNN is a neural network designed for ordered data."),
        ("Sequences", "Before learning RNNs, understand sequences because RNNs process information one step at a time."),
        ("Hidden State", "Before learning RNNs, understand hidden state because it carries information from earlier sequence steps."),
    ],
    "recurrent neural network": [
        ("Neural Networks", "Before learning RNNs, understand neural networks because an RNN is a neural network designed for ordered data."),
        ("Sequences", "Before learning RNNs, understand sequences because RNNs process information one step at a time."),
        ("Hidden State", "Before learning RNNs, understand hidden state because it carries information from earlier sequence steps."),
    ],
    "transformer": [
        ("Vectors", "Before learning Transformers, understand vectors because embeddings and attention are built from vector operations."),
        ("Word Embeddings", "Before learning Transformers, understand word embeddings because Transformers represent words as learned numeric features."),
        ("Attention Mechanism", "Before learning Transformers, understand attention because Transformers are built around self-attention."),
    ],
    "gradient descent": [
        ("Functions", "Before learning gradient descent, understand functions because gradient descent improves a function's output."),
        ("Derivatives", "Before learning gradient descent, understand derivatives because they indicate which direction changes a function most."),
        ("Optimization", "Before learning gradient descent, understand optimization because gradient descent is a method for improving an objective."),
    ],
}


def _task_instruction(task: str) -> str:
    """Return the learning contract for Prism's current tutoring action."""
    if task == "Explain":
        return (
            " Respond in 150 to 250 words using exactly these headings: "
            "## What is it?, ## Why does it matter?, and ## Example. "
            "Teach the idea rather than writing an encyclopedia entry. Use one "
            "simple, concrete example and explain unfamiliar terms briefly."
        )
    if task == "Explain simply":
        return (
            " Teach a learner around 10 to 12 years old. Use everyday language "
            "and a relatable example when it genuinely clarifies the idea. Avoid "
            "fantasy analogies and do not remove the important technical meaning."
        )
    if task.startswith("Create a two-question quiz"):
        return (
            " Create two meaningful multiple-choice questions that test reasoning "
            "about the selected concept, not simple definitions. For each question, "
            "provide exactly four options, then `Answer:`, followed by the correct "
            "option, and `Why:`, followed by one short explanation. Use this order: "
            "`Question 1:`, four options, `Answer:`, `Why:`. Do not reveal answers "
            "before the option list."
        )
    if task.startswith("Give two relatable examples"):
        return (
            " Give exactly three distinct examples: one everyday example, one "
            "technical example, and one real-world application. Add a short heading "
            "for each. Use the examples to deepen understanding rather than repeat "
            "the explanation."
        )
    if task == PREREQUISITE_TASK:
        return (
            " Return 3 to 5 actual prerequisite concepts, ordered from easiest to "
            "hardest, as a numbered Markdown list in the format `Concept: reason`. "
            "Each concept must be fundamental and directly required before learning "
            "the selected topic. In every reason, explicitly say why the concept comes "
            "before the selected topic. Do not use generic educational labels, "
            "implementation tools, programming languages, libraries, or hardware "
            "unless truly essential. Keep titles and reasons concise."
        )
    return ""


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
                "You are Prism, an intelligent, patient educational tutor. "
                f"{task} the user's selected text for a {reading_level}-level "
                "learner. Stay focused on that exact concept. Use Markdown, "
                "short paragraphs, and bullets only when they improve clarity. "
                "Preserve technical accuracy while avoiding unnecessary jargon."
                + _task_instruction(task)
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
    return await generate_learning_content(text, "10 to 12 year old", "Explain simply")


async def generate_quiz(text: str, reading_level: str) -> str:
    """Create a short quiz."""
    return await generate_learning_content(text, reading_level, "Create a two-question quiz about")


async def generate_examples(text: str, reading_level: str) -> str:
    """Create relatable examples."""
    return await generate_learning_content(text, reading_level, "Give two relatable examples of")


async def generate_prerequisites(text: str, reading_level: str) -> str:
    """Identify needed background knowledge."""
    return await generate_learning_content(
        text, reading_level, PREREQUISITE_TASK
    )


async def generate_prerequisite_concepts(
    text: str, reading_level: str
) -> list[PrerequisiteConcept]:
    """Turn prerequisite guidance into ordered concepts for a learning-path UI."""
    if os.getenv("OPENAI_API_KEY"):
        guidance = await generate_prerequisites(text, reading_level)
        prerequisites = _parse_prerequisites(guidance)
    else:
        prerequisites = _fallback_prerequisites(text)

    if not 3 <= len(prerequisites) <= 5:
        prerequisites = _fallback_prerequisites(text)

    return [
        PrerequisiteConcept(
            id=f"prerequisite-{index + 1}",
            title=title,
            description=description,
            position=index + 1,
            depends_on=[f"prerequisite-{item + 1}" for item in range(index)],
        )
        for index, (title, description) in enumerate(prerequisites)
    ]


def _parse_prerequisites(guidance: str) -> list[tuple[str, str]]:
    """Parse the model's concise `Concept: reason` prerequisite list."""
    prerequisites = []
    for line in guidance.splitlines():
        cleaned = re.sub(r"^\s*(?:[-*]|\d+[.)])\s+", "", line).strip()
        if not cleaned or cleaned.startswith("#"):
            continue

        cleaned = cleaned.replace(chr(0x2014), ":").replace(chr(0x2013), ":")
        parts = re.split(r"\s*(?::| - )\s*", cleaned, maxsplit=1)
        if len(parts) != 2:
            continue

        title, description = parts
        title = title.replace("**", "").strip()
        description = description.replace("**", "").strip()
        if title and description:
            prerequisites.append((title, description))

    return prerequisites[:5]


def _fallback_prerequisites(text: str) -> list[tuple[str, str]]:
    """Provide topic-specific local concepts when AI generation is unavailable."""
    topic = text.strip()
    normalized_topic = re.sub(r"\s+", " ", topic.casefold())
    for key, prerequisites in FALLBACK_PREREQUISITES.items():
        if key in normalized_topic:
            return prerequisites

    return [
        (f"{topic} notation", "The symbols and terms used to describe the topic."),
        (f"{topic} inputs", "What information the topic starts with or operates on."),
        (f"{topic} operations", "The key transformations or steps involved in the topic."),
    ]


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
