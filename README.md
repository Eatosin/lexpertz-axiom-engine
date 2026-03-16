# Axiom Engine: Sovereign Auditing Intelligence

> 🚧 **STATUS: UNDER CONSTRUCTION / RAPID PROTOTYPING STAGE** 🚧

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
```

---

## 🔌 MCP Integration: The "Claude Desktop" Bridge

**What is MCP?**
Think of MCP (Model Context Protocol) as a secure "USB Cable" between the **Claude Desktop App** on your computer and the **Axiom Engine**. 
Normally, Claude cannot see your local files, databases, or private code. By turning on this bridge, you give Claude the ability to securely trigger Axiom Engine's auditing tools directly from your chat window—no uploading required!

### 🟢 Step 1: The "Secret Vault" (.env file)
For your security, we **never** put passwords or API keys inside the Claude configuration file. Instead, Axiom uses a secure local file.

1. Open the `server/` folder inside the Axiom project.
2. Create a new text file and name it exactly: `.env`
3. Paste your private keys inside like this:
```text
GROQ_API_KEY=your_groq_key_here
NVIDIA_API_KEY=your_nvidia_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_key_here
GITHUB_TOKEN=your_github_token_here
```
*(Axiom will automatically read these keys when Claude wakes it up!)*

### 🔵 Step 2: Connecting Claude Desktop

You need to tell the Claude Desktop app where Axiom Engine lives on your computer.

**For Windows Users:**
1. Press `Windows Key + R` on your keyboard, paste `%APPDATA%\Claude` and press Enter.
2. Open the file called `claude_desktop_config.json` (if it doesn't exist, create it as a plain text file).
3. Paste the following code. **Important:** Replace `C:\\Your\\Path\\To` with the actual folder path where you downloaded this project. *(Notice the double backslashes `\\` — Windows needs these!)*

```json
{
  "mcpServers": {
    "axiom-engine": {
      "command": "C:\\Your\\Path\\To\\lexpertz-axiom-engine\\server\\start_mcp.bat"
    }
  }
}
```

**For Mac / Linux Users:**
1. Open your terminal and open this file: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Paste the following code. **Important:** Replace `/Your/Path/To` with your actual absolute folder path.

```json
{
  "mcpServers": {
    "axiom-engine": {
      "command": "/bin/bash",
      "args":[
        "/Your/Path/To/lexpertz-axiom-engine/server/start_mcp.sh"
      ]
    }
  }
}
```

### 🟣 Step 3: How to use the Axiom Bridge

1. **Restart Claude Desktop** (Quit the app completely and reopen it).
2. Look at the bottom right corner of your chat box in Claude. You should now see a **🔌 Plug Icon**.
3. Click the plug icon to confirm `Axiom-Sovereign-Auditor` is connected.

**You can now type commands like this directly to Claude:**
> *"Use Axiom to search the vault for 'Liability' in `Contract_A.pdf`."*

> *"Trigger an Axiom Audit to compare `MSA_2024.pdf` against our live GitHub code repository at `MyCompany/backend`, file `billing.py`."*

Claude will reach out to your local Axiom Engine, run the formal audit, and print the resulting Comparative Matrix right in your desktop app!

---

## Audit Protocols (The Architect's Guide)

Axiom uses **Conditional Cognitive Protocols** based on the domain:

*   **Financial Audits:** Applies "Column Drift" prevention to ensure 10-K data extraction matches the correct fiscal year.
*   **Legal/Contractual:** Distinguishes between mandatory obligations ("shall") and discretionary rights ("may").
*   **Code Compliance:** Cross-references `GitHub` repository logic against `PDF` regulatory policy to find hidden risk.

---

## The Strategist Node (Comparative Mode)
When multiple documents (Exhibits) are loaded, Axiom automatically triggers the **Strategist Node**. It performs a **Map-Reduce** audit:
1. **Map:** Extract clause-maps for Document A and Document B.
2. **Reduce:** Compare the delta to highlight contradictions or missing enforcement clauses.

---

## License
Proprietary. *Cryptographically verified by Axiom Engine.*
