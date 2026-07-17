// The popup keeps the selected text in memory while users switch among
// learning actions. Responses are cached for the life of the popup.

const SELECTED_TEXT_KEY = "prismSelectedText";
const API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_READING_LEVEL = "beginner";
const ACTIONS = {
  explain: { endpoint: "/explain" },
  eli5: { endpoint: "/eli5" },
  quiz: { endpoint: "/quiz" },
  examples: { endpoint: "/examples" },
  "learning-path": { endpoint: "/prerequisites" },
};

const selectedTextElement = document.querySelector("#selected-text");
const resultElement = document.querySelector("#result");
const resultPanel = document.querySelector("#result-panel");
const loadingElement = document.querySelector("#loading");
const tabs = [...document.querySelectorAll("[role=tab]")];
const breadcrumbOriginal = document.querySelector("#breadcrumb-original");
const breadcrumbCurrent = document.querySelector("#breadcrumb-current");
const breadcrumbSeparator = document.querySelector("#breadcrumb-separator");
const backToOriginalButton = document.querySelector("#back-to-original");

let originalSelectedText = "";
let selectedText = "";
let selectedPrerequisite = null;
let activeAction = "explain";
let pendingRequestCount = 0;
const responseCache = new Map();
const inFlightRequests = new Map();

function setLoading(isLoading) {
  loadingElement.hidden = !isLoading;
  resultPanel.setAttribute("aria-busy", String(isLoading));
}

function beginRequest() {
  pendingRequestCount += 1;
  setLoading(true);
}

function finishRequest() {
  pendingRequestCount = Math.max(0, pendingRequestCount - 1);
  setLoading(pendingRequestCount > 0);
}

function updateTabs() {
  tabs.forEach((tab) => {
    tab.setAttribute(
      "aria-selected",
      String(tab.dataset.action === activeAction),
    );
  });
}

function updateBreadcrumb() {
  const hasPrerequisite = selectedPrerequisite !== null;
  breadcrumbOriginal.textContent = originalSelectedText || "Original Topic";
  breadcrumbOriginal.title = originalSelectedText;
  breadcrumbCurrent.hidden = !hasPrerequisite;
  breadcrumbSeparator.hidden = !hasPrerequisite;
  backToOriginalButton.hidden = !hasPrerequisite;

  if (hasPrerequisite) {
    breadcrumbCurrent.textContent = selectedPrerequisite.title;
    backToOriginalButton.textContent = `← Back to ${originalSelectedText}`;
  }
}

function getCachedResponse(topic, action) {
  return responseCache.get(topic)?.get(action);
}

function cacheResponse(topic, action, data) {
  if (!responseCache.has(topic)) {
    responseCache.set(topic, new Map());
  }
  responseCache.get(topic).set(action, data);
}

function renderTextResult(text) {
  resultElement.replaceChildren();
  resultElement.textContent = text;
}

function renderPrerequisiteLesson(concept, explanation) {
  resultElement.replaceChildren();
  const lesson = document.createElement("article");
  const title = document.createElement("h3");
  const explanationSection = document.createElement("section");
  const explanationHeading = document.createElement("strong");
  const explanationCopy = document.createElement("p");
  const importanceSection = document.createElement("section");
  const importanceHeading = document.createElement("strong");
  const importanceCopy = document.createElement("p");

  lesson.className = "lesson";
  title.className = "lesson-title";
  title.textContent = concept.title;
  explanationSection.className = "lesson-section";
  explanationHeading.className = "lesson-heading";
  explanationHeading.textContent = "Short explanation";
  explanationCopy.className = "lesson-copy";
  explanationCopy.textContent = explanation;
  importanceSection.className = "lesson-section";
  importanceHeading.className = "lesson-heading";
  importanceHeading.textContent = "Why it matters before the original topic";
  importanceCopy.className = "lesson-copy";
  importanceCopy.textContent =
    `${concept.description} This foundation helps before learning ${originalSelectedText}.`;

  explanationSection.append(explanationHeading, explanationCopy);
  importanceSection.append(importanceHeading, importanceCopy);
  lesson.append(title, explanationSection, importanceSection);
  resultElement.append(lesson);
}

function renderLearningPath(concepts) {
  resultElement.replaceChildren();
  const list = document.createElement("ol");
  list.className = "learning-path";

  concepts.forEach((concept) => {
    const item = document.createElement("li");
    const card = document.createElement("button");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    card.type = "button";
    card.className = "concept-card";
    title.textContent = concept.title;
    description.className = "concept-description";
    description.textContent = concept.description;
    card.append(title, description);
    card.addEventListener("click", () => selectPrerequisite(concept));
    item.append(card);
    list.append(item);
  });

  resultElement.append(list);
}

function renderResult(action, data) {
  if (action === "learning-path") {
    renderLearningPath(data.concepts);
    return;
  }
  renderTextResult(data.explanation);
}

async function requestAction(action, topic) {
  const response = await fetch(`${API_BASE_URL}${ACTIONS[action].endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // This matches the existing ExplainRequest schema used by every endpoint.
    body: JSON.stringify({
      text: topic,
      reading_level: DEFAULT_READING_LEVEL,
    }),
  });

  if (!response.ok) {
    throw new Error(`The backend returned ${response.status}.`);
  }
  return response.json();
}

function requestKey(topic, action) {
  return `${topic}\u0000${action}`;
}

function getOrRequestActionData(action, topic) {
  const cachedResponse = getCachedResponse(topic, action);
  if (cachedResponse) {
    return Promise.resolve(cachedResponse);
  }

  const key = requestKey(topic, action);
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const request = requestAction(action, topic)
    .then((data) => {
      cacheResponse(topic, action, data);
      return data;
    })
    .finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, request);
  return request;
}

async function activateAction(action) {
  activeAction = action;
  updateTabs();

  if (!selectedText) {
    return;
  }

  // Capture the topic so late responses are never rendered for a different
  // prerequisite selected while the request was in progress.
  const topic = selectedText;
  const cachedResponse = getCachedResponse(topic, action);
  if (cachedResponse) {
    renderResult(action, cachedResponse);
    return;
  }

  renderTextResult("");
  beginRequest();

  try {
    const data = await getOrRequestActionData(action, topic);
    if (activeAction === action && selectedText === topic) {
      renderResult(action, data);
    }
  } catch (error) {
    console.warn(`Prism could not complete the ${action} request.`, error);
    if (activeAction === action && selectedText === topic) {
      renderTextResult(
        "Prism can't reach its local backend right now. Start the Prism backend and try again.",
      );
    }
  } finally {
    // Always clear the request state, even if the user changed tabs while the
    // request was in flight. This prevents a stale spinner after a response.
    finishRequest();
  }
}

async function selectPrerequisite(concept) {
  // This changes only popup state. prismSelectedText remains the original
  // webpage highlight in chrome.storage.local.
  selectedPrerequisite = concept;
  selectedText = concept.title;
  updateBreadcrumb();

  const topic = concept.title;
  const cachedExplanation = getCachedResponse(topic, "explain");
  if (cachedExplanation) {
    renderPrerequisiteLesson(concept, cachedExplanation.explanation);
    return;
  }

  renderTextResult("");
  beginRequest();

  try {
    // Reuse the existing ExplainRequest endpoint for each selected concept.
    const data = await getOrRequestActionData("explain", topic);
    // A response may finish after another card or tab has been selected.
    if (
      activeAction === "learning-path" &&
      selectedText === topic &&
      selectedPrerequisite?.id === concept.id
    ) {
      renderPrerequisiteLesson(concept, data.explanation);
    }
  } catch (error) {
    console.warn("Prism could not explain this prerequisite.", error);
    if (
      activeAction === "learning-path" &&
      selectedText === topic &&
      selectedPrerequisite?.id === concept.id
    ) {
      renderTextResult(
        "Prism can't reach its local backend right now. Start the Prism backend and try again.",
      );
    }
  } finally {
    finishRequest();
  }
}

function restoreOriginalTopic() {
  selectedText = originalSelectedText;
  selectedPrerequisite = null;
  updateBreadcrumb();

  const originalLearningPath = getCachedResponse(
    originalSelectedText,
    "learning-path",
  );
  if (activeAction === "learning-path" && originalLearningPath) {
    renderResult("learning-path", originalLearningPath);
    return;
  }

  renderTextResult("Original topic restored. Choose an action to continue.");
}

async function initializePopup() {
  const stored = await chrome.storage.local.get(SELECTED_TEXT_KEY);
  originalSelectedText = stored[SELECTED_TEXT_KEY] || "";
  selectedText = originalSelectedText;

  if (!selectedText) {
    tabs.forEach((tab) => {
      tab.disabled = true;
    });
    return;
  }

  selectedTextElement.textContent = selectedText;
  updateBreadcrumb();
  await activateAction(activeAction);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => activateAction(tab.dataset.action));
});

backToOriginalButton.addEventListener("click", restoreOriginalTopic);

initializePopup();
