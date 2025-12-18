# 🧠 CodeSensei — AI Code Intelligence Operating System

> Transform any codebase into an interactive knowledge graph. Visualize dependencies, trace execution, predict breaking changes — all powered by multi-agent AI reasoning.

[🚀 Try Live Demo](https://codesensei.vercel.app) | [📺 Watch Demo (2min)](youtube-link) | [📖 Read Technical Deep-Dive](blog-link)

---

## 🎯 What is CodeSensei?

CodeSensei analyzes code repositories using a multi-agent AI pipeline to generate:

- **Brain Map:** Interactive dependency graph (D3.js force-directed visualization)
- **Execution Tracer:** Step-by-step code execution walkthrough
- **Risk Detector:** Identifies bugs, anti-patterns, vulnerabilities
- **Impact Simulator:** Predicts what breaks when you change code
- **Semantic Search:** Chat with your codebase using natural language

**Built with:** React, TypeScript, D3.js, Gemini API

---

## ⚡ Quick Start

1. Upload a code file or import a GitHub repository  
2. CodeSensei runs **7 specialized AI agents**:
   - Structure Agent — maps modules & functions  
   - Behavior Agent — traces execution flow  
   - Semantic Agent — understands intent & meaning  
   - Risk Agent — detects bugs & vulnerabilities  
   - Execution Agent — simulates runtime flow  
   - Impact Agent — predicts breaking changes  
   - Synthesizer Agent — merges everything into a unified graph  
3. Explore the interactive visualizations

**No installation required.** Works directly in the browser.

---

## 🏗️ Architecture


User Input
↓
Repo Ingestion / Chunking
↓
Multi-Agent AI Pipeline
↓
Knowledge Graph + Analysis
↓
React UI (Graphs, Chat, Simulation)


---

## 📊 Technical Highlights

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS  
- **Visualization:** D3.js force-directed graphs  
- **AI Layer:** Gemini API via `@google/genai`  
- **Architecture:** Explicit multi-agent orchestration with a synthesizer stage  
- **Demo Mode:** Automatic fallback when uploads or analysis fail

---

## 🚧 Known Limitations & Roadmap

**Current:**
- Client-side GitHub ingestion (public repos)
- Regex-based chunking (AST planned)
- No persistence across refresh

**Planned:**
- AST-based chunking (Tree-sitter)
- Vector DB + RAG for large repos
- Streaming agent outputs
- VSCode extension

---

## 🤝 Feedback

Built by **Ujwal Mahajan** as a hands-on exploration of multi-agent AI systems for developer tooling.

- Live Demo: https://codesensei.vercel.app  
- GitHub Issues: Use this repo  

---

## 📝 License

MIT License

