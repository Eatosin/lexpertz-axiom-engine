# 🛡️ Axiom Engine: Sovereign Auditing Intelligence
> 🚧 **STATUS: UNDER CONSTRUCTION / BETA ACCESS ONLY** 🚧

Axiom Engine is an **Enterprise-Grade Evidence-Gated Auditing Platform**. It uses a **Sovereign Auditor** architecture—a multi-agent reasoning circuit that cross-references static PDF policies, live databases, and GitHub code to detect contradictions and compliance gaps in real-time.

---

## 🏛️ The Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Reasoning** | `LangGraph` + `Llama-3.3-70B` | Orchestrates audit circuits (Librarian/Strategist/Prosecutor). |
| **Ingestion** | `Docling V2` + `NVIDIA E5-v5` | High-fidelity structural parsing & 1024-D vectorization. |
| **Interoperability**| **`Universal Connector`** | Bridges local files to the Cloud Engine via MCP. |

---

## 🔌 Claude Desktop Integration (The 1-Minute Setup)

Axiom Engine follows you into your workflow. You can connect the **Claude Desktop App** to Axiom to audit your local files without ever uploading them to a website.

### 🟢 Step 1: Get Your API Key
1. Log in to the [Axiom Dashboard](https://axiom-engine-six.vercel.app/).
2. Go to **Developer Settings**.
3. Click **Generate MCP Token** and copy your key (it starts with `axm_live_...`).

### 🔵 Step 2: Connect the Bridge
You need to tell Claude to use the **Axiom Universal Connector**. You do NOT need to install Python or download any scripts.

1. Open your Claude configuration file:
   - **Windows:** Press `Win + R`, paste `%APPDATA%\Claude\claude_desktop_config.json` and hit Enter.
   - **Mac:** Open `~/Library/Application Support/Claude/claude_desktop_config.json` in a text editor.
2. Paste this exact block into the file (replace `your_key_here` with the token from Step 1):

```json
{
  "mcpServers": {
    "axiom": {
      "command": "npx",
      "args": ["-y", "@axiom-engine/connector"],
      "env": {
        "AXIOM_API_KEY": "your_key_here" 
      }
    }
  }
}
```

### 🟣 Step 3: Start Auditing
1. **Restart Claude Desktop** (Quit the app completely and reopen).
2. Look for the **🔌 Plug Icon** in the chat box.
3. Ask Claude to audit any file on your computer:
   > *"@axiom audit my local file `C:/Documents/Contract.pdf`. Check for any liability gaps."*

---

## 🔬 Sovereign Audit Protocols

Axiom applies specialized frameworks based on your query:

*   **Financial Reconciliation:** Reconciles PDF claims against your live database to catch variances.
*   **Code-to-Policy Mapping:** Cross-references live GitHub code against regulatory PDFs to find implementation gaps.
*   **The Strategist (Map-Reduce):** When comparing 2+ documents, Axiom automatically builds a **Comparative Matrix** of risks and contradictions.

---

## ⚡ Real-Time Observability
Axiom features the **Agentic Live-Stream**. As the engine thinks, the UI (and the MCP bridge) streams the progress of individual agents—from the **Librarian** fetching evidence to the **Prosecutor** verifying the final report.

---
**Axiom Engine: Standard AI Guesses. Axiom Proves.**
*Proprietary. Cryptographically verified by the Sovereign Auditor.*
