# explain-the-internet


> **An AI-powered learning layer for the web.**

Prism transforms any webpage into an adaptive learning experience. Instead of simply summarizing content, it helps users understand concepts through personalized explanations, prerequisite learning paths, quizzes, examples, and interactive learning modes.

Built for the **OpenAI Build Week 2026 Hackathon**.

---

## ✨ Vision

The web contains an incredible amount of knowledge, but it assumes readers already understand the concepts being discussed.

Prism bridges this gap by acting as an intelligent educational companion. Highlight any concept on a webpage, and Prism helps you learn it at your own level instead of simply giving a one-size-fits-all explanation.

---

## 🚀 Planned Features

- 📖 Explain selected text
- 🧒 Explain Like I'm 5 (ELI5)
- 🌳 Interactive Learning Paths
- 🧠 Quiz Generation
- 💡 Real-world Examples
- 🎯 Challenge Mode
- 📝 Personalized Learning History
- 🔍 Browser Extension for learning anywhere on the web

---

## 🏗️ Architecture

```
Browser Extension
        │
        ▼
 FastAPI Backend
        │
        ▼
 Learning Engine
        │
        ▼
 OpenAI GPT-5.6
```

---

## 🛠️ Tech Stack

### Backend
- FastAPI
- Python
- OpenAI SDK
- Pydantic

### Frontend
- Chrome Extension (Manifest V3)
- React (planned)

### AI
- GPT-5.6
- Codex

---

## 📂 Project Structure

```
prism/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── models.py
│   └── main.py
│
├── extension/
│
├── DEVLOG.md
├── README.md
└── LICENSE
```

---

## 🚧 Current Progress

### ✅ Completed

- Modular FastAPI backend
- Health endpoint
- Explanation endpoint
- ELI5 endpoint
- Quiz endpoint
- Examples endpoint
- Structured Learning Path endpoint
- Local placeholder AI responses
- OpenAI service abstraction

### 🔄 In Progress

- Chrome Extension
- Browser integration
- Interactive learning interface

### 📅 Planned

- Knowledge Graph
- Personalized Learning Memory
- Adaptive learning recommendations
- GPT-5.6 integration
- Interactive frontend

---

## 🎯 Why Prism?

Most AI tools answer questions.

Prism teaches concepts.

Instead of replacing learning, it supports it by helping learners build understanding one concept at a time.

---

## 👩‍💻 Development

Prism is being built using **Codex** as an engineering collaborator throughout the OpenAI Build Week Hackathon. Development progress is documented in `DEVLOG.md`.

---

## 📄 License

This project is released under the MIT License.
