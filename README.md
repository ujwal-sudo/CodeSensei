# 🧠 CodeSensei

> AI-powered code analysis and architectural intelligence platform

CodeSensei lets developers import any codebase and runs a multi-agent AI pipeline to produce a comprehensive architectural report — with an interactive brain map, risk assessment, and context-aware chat.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-powered-646CFF?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-CDN-06B6D4?style=flat-square&logo=tailwindcss)

---

## ✨ Features

- **Streaming Analysis** — Results appear progressively as each agent completes; explore the Brain Map and Dashboard while analysis is still running
- **Interactive Brain Map** — D3.js force-directed graph showing module topology and dependencies
- **Risk Assessment Center** — Detailed risk cards with severity levels (critical / high / medium / low) and mitigation strategies
- **AI Chat Interface** — Context-aware Q&A about the analyzed codebase using the full analysis as context
- **Impact Simulator** — Predicts change impact across files, affected tests, and recommended mitigations
- **Execution Cinematic** — Step-by-step execution flow visualization
- **GitHub Import** — 3-tier fallback: Express backend → Octokit client-side → Demo mode
- **Local Folder Upload** — Direct folder upload via `webkitdirectory` for local codebases

---

## 🤖 Multi-Agent Pipeline

Analysis is orchestrated by a streaming `AsyncGenerator`-based pipeline (`agentOrchestrator.ts`) that runs 6 specialized AI agents in phases:

| Agent | Responsibility |
|---|---|
| **Structure** | Identifies modules, file structure, and entry points |
| **Behavior** | Maps call graphs, side effects, and data flow |
| **Semantic** | Identifies APIs, design patterns, and invariants |
| **Risk** | Detects security vulnerabilities, bugs, and maintainability issues |
| **Execution** | Simulates runtime execution flow step-by-step |
| **Synthesizer** | Merges all outputs into a final executive summary, architecture description, tech stack, and knowledge graph |

Behavior + Semantic run in parallel. Risk + Execution run in parallel. The Synthesizer runs last.

All agents share a common `baseAgent.ts` with robust JSON parsing (including truncated JSON repair), schema-driven prompts, and tiered model selection (STANDARD / FLASH / PRO).

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS (CDN)
- **Visualization:** D3.js (force-directed graph), Recharts
- **Icons:** Lucide React
- **GitHub Integration:** Octokit
- **Queue Management:** p-queue
- **AI Backend:** OpenRouter API (`nvidia/nemotron-3-nano-30b-a3b:free`)
- **Optional Backend:** Express (for GitHub import proxying)

---

## 🏗️ Project Structure
```
/App.tsx                    # Main app component (Dashboard, Brain Map, Risk Center, Chat)
/components/                # BrainMap, ExecutionCinematic, ImpactSimulator, GitHubImporter,
                            # ParticleBackground, GlassPanel, NeonButton
/services/
  geminiService.ts          # OpenRouter API service with request queue
  githubService.ts          # GitHub import with Octokit fallback
/src/agents/                # 7 specialized agents + baseAgent.ts
/src/agentOrchestrator.ts   # Streaming AsyncGenerator multi-agent pipeline
/src/chunker/               # Repository code chunking logic
/src/utils/                 # Key manager, rate limiter, JSON repair utilities
/backend/                   # Express backend server (optional)
/types.ts                   # TypeScript interfaces for all data models
/prompts.ts                 # System prompts for all AI agents
```

---

## ⚙️ Robust Error Handling

- **Multi-key API rotation** (`keyManager.ts`) — rotates across multiple OpenRouter keys automatically
- **Rate limiter** with p-queue and exponential backoff
- **Retry logic** for 429 / 401 / 503 responses
- **Graceful degradation** — analysis continues even if individual agents fail
- **Truncated JSON repair** — handles incomplete AI responses without crashing

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- An [OpenRouter](https://openrouter.ai) API key

### Installation
```bash
git clone https://github.com/your-username/codesensei.git
cd codesensei
npm install
```

### Configuration

Create a `.env` file in the root:
```env
VITE_OPENROUTER_API_KEY=your_key_here
# Optional: add multiple keys for rotation
VITE_OPENROUTER_API_KEY_2=your_second_key_here
```

### Run
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Optional: Run the Express Backend

The Express backend enables server-side GitHub import proxying. Without it, CodeSensei falls back to Octokit client-side or demo mode.
```bash
cd backend
npm install
node server.js
```

---

## 🎨 Design

Premium dark-theme glassmorphism UI with:
- Particle background animation
- Neon accents (cyan / purple / green)
- Custom scrollbars
- Inter + Fira Code typography
- Smooth fade-in animations

---

## 📄 License

MIT
