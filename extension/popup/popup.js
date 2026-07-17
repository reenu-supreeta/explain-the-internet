// The popup reads the selection stored by the service worker and requests an
// explanation only from Prism's locally running development backend.

const SELECTED_TEXT_KEY = "prismSelectedText";
const EXPLAIN_ENDPOINT = "http://127.0.0.1:8000/explain";
const DEFAULT_READING_LEVEL = "beginner";
const selectedTextElement = document.querySelector("#selected-text");
const explanationElement = document.querySelector("#explanation");

async function renderSelection() {
  const stored = await chrome.storage.local.get(SELECTED_TEXT_KEY);
  const selectedText = stored[SELECTED_TEXT_KEY];

  if (!selectedText) {
    return;
  }

  // textContent prevents page text from being interpreted as popup HTML.
  selectedTextElement.textContent = selectedText;
  explanationElement.textContent = "Generating explanation...";

  try {
    // This matches the backend's ExplainRequest schema exactly.
    const response = await fetch(EXPLAIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: selectedText,
        reading_level: DEFAULT_READING_LEVEL,
      }),
    });

    if (!response.ok) {
      throw new Error(`The backend returned ${response.status}.`);
    }

    const data = await response.json();
    explanationElement.textContent = data.explanation;
  } catch (error) {
    console.warn("Prism could not generate an explanation.", error);
    explanationElement.textContent =
      "Prism can't reach its local backend right now. Start the Prism backend and try again.";
  }
}

renderSelection();
