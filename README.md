# Prism

> **Learn concepts in the right order.**

Prism is an AI-powered Chrome extension that transforms passive reading into active learning. Instead of simply explaining highlighted text, Prism identifies prerequisite concepts, generates quizzes, provides examples, and guides users through ideas in the order they should be learned.

Whether you're reading a research paper, documentation, blog post, or online article, Prism helps you build understanding step by step—without leaving the page.

---

## ✨ Why Prism?

Modern AI assistants are excellent at answering questions.

But they often assume you already understand the foundations.

For example, if you ask about **Transformers**, you'll likely receive an explanation involving **Attention**, **Embeddings**, and **Vectors**—concepts you may not know yet.

Prism bridges this gap by helping users learn prerequisite concepts before returning to the original topic. Instead of overwhelming learners with information, it builds understanding progressively.

---

## 🚀 Features

- 📖 **Explain** – Clear, structured explanations with examples.
- 🧒 **ELI5** – Beginner-friendly explanations using simple language.
- 🧠 **Quiz** – Interactive conceptual quizzes with answer explanations.
- 💡 **Examples** – Everyday, technical, and real-world examples.
- 🌱 **Learning Path** – Explore prerequisite concepts recursively.
- 🧭 **Breadcrumb Navigation** – Easily return to previously explored concepts.
- 📝 **Markdown Rendering** – Cleanly formatted AI responses.
- ⚡ **Smart Caching** – Avoid repeated API calls for previously explored concepts.
- 🎨 **Modern UI** – A clean, responsive interface designed for focused learning.

---

## 🖼️ Screenshots

> Add screenshots here before submission.

### Explain

<!-- Screenshot -->

### Quiz

<!-- Screenshot -->

### Learning Path

<!-- Screenshot -->

---

## 🧩 How It Works

1. Highlight any text on a webpage.
2. Right-click and choose **Explain with Prism**.
3. Select one of the learning modes:
   - Explain
   - ELI5
   - Quiz
   - Examples
   - Learning Path
4. If you're missing prerequisite knowledge, explore concepts recursively using the Learning Path.
5. Return to previous topics using breadcrumb navigation.

---

## 🌱 Recursive Learning Path

Prism's key feature is its recursive Learning Path.

Instead of only explaining a concept, Prism identifies the foundational ideas required to understand it.

Example:

```
Transformer
    ↓
Word Embeddings
    ↓
Vectors
    ↓
Linear Algebra
```

Users can continue exploring prerequisites before returning to the original topic, creating a guided learning experience rather than a one-time explanation.

---

## 🏗️ Architecture

```
User
   │
   ▼
Highlight Text
   │
   ▼
Chrome Extension
   │
   ▼
FastAPI Backend
   │
   ▼
OpenAI Responses API
   │
   ▼
Structured Learning Content
   │
   ▼
Interactive Popup UI
```

---

## 🛠️ Tech Stack

### Frontend

- HTML
- CSS
- JavaScript
- Chrome Extensions API (Manifest V3)

### Backend

- Python
- FastAPI
- AsyncOpenAI

### AI

- OpenAI Responses API
- GPT-4.1 Mini

### Development Tools

- Git
- GitHub
- OpenAI Codex

---

## 📂 Project Structure

```
Prism/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── models.py
│   ├── main.py
│   └── requirements.txt
│
├── extension/
│   ├── popup/
│   ├── background.js
│   ├── content.js
│   └── manifest.json
│
└── README.md
```

---

## ⚙️ Installation

### Clone the repository

```bash
git clone https://github.com/reenu-supreeta/explain-the-internet.git
cd explain-the-internet
```

### Backend

```bash
cd backend

python -m venv venv
```

Activate the virtual environment.

**Windows**

```bash
venv\Scripts\activate
```

**macOS/Linux**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file and add your OpenAI API key:

```env
OPENAI_API_KEY=your_api_key_here
```

Run the backend:

```bash
uvicorn main:app --reload
```

---

### Chrome Extension

1. Open Chrome.
2. Navigate to `chrome://extensions`.
3. Enable **Developer Mode**.
4. Click **Load unpacked**.
5. Select the `extension` folder.

You're ready to start learning!

---

## 🎯 Built for OpenAI Build Week

Prism was created for **OpenAI Build Week** using **OpenAI Codex** as a collaborative development assistant.

Codex assisted with:

- FastAPI backend development
- Chrome extension implementation
- UI refinement
- Prompt engineering
- Recursive Learning Path
- Markdown rendering
- Debugging
- Documentation

The overall product idea, learning experience, architecture, and feature decisions were designed and iterated collaboratively throughout development.

---

## 🔮 Future Work

- Personalized learning profiles
- Concept mastery tracking
- Knowledge graph visualization
- Spaced repetition for revision
- Support for PDFs and research papers

---

## 📄 License

This project is licensed under the MIT License.

---

## 💙 Acknowledgements

Built with:

- OpenAI Responses API
- FastAPI
- Chrome Extensions API
- OpenAI Codex

Special thanks to OpenAI Build Week for inspiring the project.
