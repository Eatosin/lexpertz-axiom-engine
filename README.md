# Axiom Engine: Sovereign Auditing Intelligence

Axiom Engine is an **Enterprise-Grade Evidence-Gated Auditing Platform**. Unlike standard RAG systems that "chat" with documents, Axiom uses a **Sovereign Auditor** architecture—a multi-agent reasoning circuit that cross-references static PDFs, live financial databases, and internal codebase logic to detect contradictions, risk deltas, and compliance gaps.

---

## The Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Reasoning** | `LangGraph` + `Llama-3.3-70B` | Orchestrates audit circuits (Librarian/Strategist/Prosecutor). |
| **Ingestion** | `Docling V2` + `NVIDIA E5-v5` | High-fidelity structural parsing & 1024-D vectorization. |
| **Integrity** | `RAGAS` + `Adversarial Prosecutor` | Zero-hallucination gating (Adversarial critique). |
| **Interoperability**| `MCP` (Model Context Protocol) | Bridges your local machine, GitHub, and IDEs to the Engine. |

---

## 🚀 Getting Started (Sovereign Installation)

### 1. Prerequisites
- Node.js v20+
- Python 3.11+
- Git & Supabase Account

### 2. Deployment
```bash
# Clone the sovereign core
git clone https://github.com/EATosin/lexpertz-axiom-engine.git
cd lexpertz-axiom-engine/server

# Setup the Isolated Environment
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows

# Hydrate dependencies
pip install -r requirements.txt
