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
const LOADING_MESSAGES = {
  explain: "Explaining...",
  eli5: "Simplifying...",
  quiz: "Generating quiz...",
  examples: "Finding examples...",
  "learning-path": "Building learning path...",
};

const selectedTextElement = document.querySelector("#selected-text");
const resultElement = document.querySelector("#result");
const resultPanel = document.querySelector("#result-panel");
const loadingElement = document.querySelector("#loading");
const loadingTextElement = document.querySelector("#loading-text");
const tabs = [...document.querySelectorAll("[role=tab]")];
const breadcrumb = document.querySelector("#breadcrumb");
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

class BackendRequestError extends Error {
  constructor(status) {
    super("Prism backend request failed.");
    this.status = status;
  }
}

function setLoading(isLoading) {
  loadingElement.hidden = !isLoading;
  resultPanel.setAttribute("aria-busy", String(isLoading));
}

function updateLoadingText(action) {
  loadingTextElement.textContent = LOADING_MESSAGES[action];
}

function beginRequest(action = activeAction) {
  pendingRequestCount += 1;
  updateLoadingText(action);
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
  // The original topic already appears in the Selected Text card. Reveal this
  // navigation only when it adds context for a selected prerequisite.
  breadcrumb.hidden = !hasPrerequisite;
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

function normalizeTopicKey(text) {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:the|a|an)\s+/, "");

  return normalized || text.trim().toLowerCase();
}

function getCachedResponse(topic, action) {
  return responseCache.get(normalizeTopicKey(topic))?.get(action);
}

function cacheResponse(topic, action, data) {
  const cacheKey = normalizeTopicKey(topic);
  if (!responseCache.has(cacheKey)) {
    responseCache.set(cacheKey, new Map());
  }
  responseCache.get(cacheKey).set(action, data);
}

function playResultTransition() {
  resultElement.classList.remove("result-enter");
  requestAnimationFrame(() => resultElement.classList.add("result-enter"));
}

function appendInlineMarkdown(element, text) {
  const tokenPattern = /(`[^`]*`|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\n]+?\*|_[^_\n]+?_)/g;
  let cursor = 0;

  for (const match of text.matchAll(tokenPattern)) {
    element.append(document.createTextNode(text.slice(cursor, match.index)));
    const token = match[0];
    const content = token.slice(token.startsWith("**") || token.startsWith("__") ? 2 : 1, token.startsWith("**") || token.startsWith("__") ? -2 : -1);
    const inlineElement = document.createElement(
      token.startsWith("`") ? "code" : token.startsWith("*") || token.startsWith("_") ? (token.startsWith("**") || token.startsWith("__") ? "strong" : "em") : "span",
    );
    inlineElement.textContent = content;
    element.append(inlineElement);
    cursor = match.index + token.length;
  }

  element.append(document.createTextNode(text.slice(cursor)));
}

function createMarkdownFragment(markdown) {
  const fragment = document.createDocumentFragment();
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeLines.join("\n");
      pre.append(code);
      fragment.append(pre);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const element = document.createElement(`h${heading[1].length}`);
      appendInlineMarkdown(element, heading[2]);
      fragment.append(element);
      index += 1;
      continue;
    }

    const listItem = line.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (listItem) {
      const isOrdered = /\d+\./.test(listItem[2]);
      const list = document.createElement(isOrdered ? "ol" : "ul");
      while (index < lines.length) {
        const item = lines[index].match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
        if (!item || /\d+\./.test(item[2]) !== isOrdered) break;
        const listEntry = document.createElement("li");
        appendInlineMarkdown(listEntry, item[3]);
        list.append(listEntry);
        index += 1;
      }
      fragment.append(list);
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    const paragraph = document.createElement("p");
    appendInlineMarkdown(paragraph, paragraphLines.join(" "));
    fragment.append(paragraph);
  }

  return fragment;
}

function renderMarkdown(container, markdown) {
  container.replaceChildren();
  container.append(createMarkdownFragment(markdown));
}

function renderTextResult(text) {
  resultElement.className = "markdown-content";
  renderMarkdown(resultElement, text);
  playResultTransition();
}

function friendlyErrorMessage(error) {
  if (error instanceof BackendRequestError) {
    if (error.status === 401 || error.status === 403) {
      return "Backend configuration needs attention.";
    }
    if (error.status === 429) {
      return "The AI service is temporarily unavailable.";
    }
    return "Something went wrong on the server. Please try again.";
  }

  // Fetch rejects for connection failures, including when the local FastAPI
  // server is stopped or cannot be reached from the extension.
  return "Prism backend isn't running.";
}

function renderPrerequisiteLesson(concept, explanation) {
  resultElement.replaceChildren();
  resultElement.className = "";
  const lesson = document.createElement("article");
  const title = document.createElement("h3");
  const explanationSection = document.createElement("section");
  const explanationHeading = document.createElement("strong");
  const explanationCopy = document.createElement("div");
  const importanceSection = document.createElement("section");
  const importanceHeading = document.createElement("strong");
  const importanceCopy = document.createElement("p");

  lesson.className = "lesson";
  title.className = "lesson-title";
  title.textContent = concept.title;
  explanationSection.className = "lesson-section";
  explanationHeading.className = "lesson-heading";
  explanationHeading.textContent = "Short explanation";
  explanationCopy.className = "lesson-copy markdown-content";
  renderMarkdown(explanationCopy, explanation);
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
  playResultTransition();
}

function renderLearningPath(concepts) {
  resultElement.replaceChildren();
  resultElement.className = "";
  const introduction = document.createElement("p");
  const list = document.createElement("ol");
  introduction.className = "learning-path-intro";
  introduction.textContent = "Before this, understand...";
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

  resultElement.append(introduction, list);
  playResultTransition();
}

function parseQuiz(markdown) {
  const questions = [];
  let currentQuestion = null;
  let section = "question";

  for (const line of markdown.split("\n")) {
    const questionMatch = line.match(
      /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:question|q)\s*(?:\d+)?\s*[:.)-]?(?:\*\*)?\s*(.*)$/i,
    );
    const numberedQuestion = line.match(/^\s*\d+[.)]\s+(.+\?)\s*$/);
    const answerMatch = line.match(
      /^\s*(?:[-*]\s*)?(?:\*\*)?answer(?:\s*\d+)?\s*[:.)-]?(?:\*\*)?\s*(.*)$/i,
    );

    if (questionMatch || numberedQuestion) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        question: [questionMatch ? questionMatch[1] : numberedQuestion[1]],
        answer: [],
      };
      section = "question";
      continue;
    }

    if (answerMatch && currentQuestion) {
      currentQuestion.answer.push(answerMatch[1]);
      section = "answer";
      continue;
    }

    if (currentQuestion) {
      currentQuestion[section].push(line);
    }
  }

  if (currentQuestion) questions.push(currentQuestion);
  return questions.filter((item) => item.question.join("\n").trim());
}

function renderQuiz(markdown) {
  const questions = parseQuiz(markdown);
  if (!questions.length) {
    renderTextResult(markdown);
    return;
  }

  resultElement.replaceChildren();
  resultElement.className = "quiz-list";

  questions.forEach((item, index) => {
    const card = document.createElement("article");
    const label = document.createElement("span");
    const question = document.createElement("div");
    const revealButton = document.createElement("button");
    const answer = document.createElement("div");
    const answerId = `quiz-answer-${index}`;
    const answerMarkdown = item.answer.join("\n").trim();

    card.className = "quiz-card";
    label.className = "quiz-label";
    label.textContent = `Question ${index + 1}`;
    question.className = "quiz-question markdown-content";
    renderMarkdown(question, item.question.join("\n").trim());
    revealButton.className = "reveal-answer";
    revealButton.type = "button";
    revealButton.textContent = "Reveal Answer";
    revealButton.setAttribute("aria-expanded", "false");
    revealButton.setAttribute("aria-controls", answerId);
    answer.id = answerId;
    answer.className = "quiz-answer markdown-content";
    answer.hidden = true;
    renderMarkdown(
      answer,
      answerMarkdown || "No answer was included in this quiz response.",
    );
    revealButton.addEventListener("click", () => {
      const isHidden = answer.hidden;
      answer.hidden = !isHidden;
      revealButton.textContent = isHidden ? "Hide Answer" : "Reveal Answer";
      revealButton.setAttribute("aria-expanded", String(isHidden));
    });

    card.append(label, question, revealButton, answer);
    resultElement.append(card);
  });
  playResultTransition();
}

function renderResult(action, data) {
  if (action === "learning-path") {
    renderLearningPath(data.concepts);
    return;
  }
  if (action === "quiz") {
    renderQuiz(data.explanation);
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
    throw new BackendRequestError(response.status);
  }
  return response.json();
}

function requestKey(topic, action) {
  return `${normalizeTopicKey(topic)}\u0000${action}`;
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
  if (pendingRequestCount > 0) {
    updateLoadingText(action);
  }

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
  beginRequest(action);

  try {
    const data = await getOrRequestActionData(action, topic);
    if (activeAction === action && selectedText === topic) {
      renderResult(action, data);
    }
  } catch (error) {
    console.warn(`Prism could not complete the ${action} request.`);
    if (activeAction === action && selectedText === topic) {
      renderTextResult(friendlyErrorMessage(error));
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
    console.warn("Prism could not explain this prerequisite.");
    if (
      activeAction === "learning-path" &&
      selectedText === topic &&
      selectedPrerequisite?.id === concept.id
    ) {
      renderTextResult(friendlyErrorMessage(error));
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
