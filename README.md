# Axiom Engine: Sovereign Auditing Intelligence
> 🚧 **BETA ACCESS ONLY** 🚧

Axiom Engine is an **Enterprise-Grade Evidence-Gated Auditing Platform**. It uses a **Sovereign Auditor** architecture—a multi-agent reasoning circuit that cross-references static PDF policies, live databases, and GitHub code to detect contradictions and compliance gaps in real-time.

---

## The Architecture (V4.6 Mixture of Experts)

Axiom Engine does not rely on a single, generic AI model. It utilizes a **Mixture of Experts (MoE)**—routing your data to specialized, world-class neural networks depending on the specific task. This eliminates the "jack-of-all-trades, master-of-none" weakness of standard chatbots.

| Layer | Technology | Business Purpose |
| :--- | :--- | :--- |
| **The Architect** | `Llama-3.3-70B` | **The Lead Auditor.** Specializes in drafting the final, highly-structured financial matrices and legal reports. |
| **The Prosecutor** | `DeepSeek-V3` | **The Adversarial Judge.** A logic-heavy engine that mathematically hunts for hallucinations and missing citations in the Architect's draft. |
| **The Editor** | `Llama-3.3-70B` (JSON Mode) | **The Data Cleaner.** Instantly scrubs and synthesizes thousands of pages of raw data into strict data structures. |
| **The Eyes** | `NVIDIA Nemotron-1B` | **The Multilingual Core.** Reads, embeds, and searches documents across 26 global languages natively. |
| **The Bridge** | **`Universal Connector`** | Connects your local files to the Cloud Engine securely via MCP (Model Context Protocol). |

---

## 🌍 Global Multilingual Auditing
Business doesn't only happen in English. Axiom Engine V4.6 is powered by NVIDIA's latest **Nemotron Multilingual Core**, granting it native understanding of 26 languages (including French, Spanish, Arabic, Chinese, and German).

*   **Cross-Lingual Intelligence:** You can ask Axiom a question in **English** ("What is the liability cap?"), and it will successfully find and translate the answer hidden inside a **Spanish** legal contract. 
*   **No Translation Tax:** Because Axiom understands the math behind the languages natively, it does not rely on slow, inaccurate translation software. It reads the foreign text exactly as a native speaker would.

---

## Zero-Friction Background Ingestion
Enterprise documents (like 100-page 10-K financial reports) are massive. Axiom Engine respects your time by utilizing a **Non-Blocking Background Pipeline**.

*   **The Sovereign Waiting Room:** When you upload a massive document, you aren't forced to stare at a frozen loading bar. Axiom calculates a live ETA and provides a sleek, animated interface showing the neural normalization process.
*   **Asynchronous Freedom:** Click "Enable Push Notifications" and switch tabs. Go answer an email or join a meeting. Axiom's background workers will crunch the data and send a native browser notification the precise second your document is ready for auditing.

---

## Claude Desktop Integration (The 1-Minute Setup)

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


***

## ⌨️ AXM-CLI: Sovereign Command Shorthand
You don't need to write long prompts. Axiom Engine supports terminal-grade shorthand commands. Simply prefix your audit queries with `/axm` to trigger specific **Sovereign Protocols**.

| Shorthand | Command Name | Technical Purpose |
| :--- | :--- | :--- |
| `/axm -a` | **Deep Audit** | Forces the Librarian to double its search depth (limit: 50). Ideal for complex legal discovery. |
| `/axm -t` | **Table Mode** | Forces the Architect to output data strictly in **Markdown Data Grids**. |
| `/axm -v` | **Verification** | Sets the Prosecutor's strictness to 0.9 (90% Faithfulness). Rejects any report with ambiguity. |
| `/axm -c` | **Comparative** | Forces the **Strategist Node** to build a side-by-side risk matrix. |
| `/axm -h` | **History RPL** | Hydrates the Architect with the last 5 turns of conversation for deep context. |
| `/axm ..` | **Root Reset** | **Hard Wipe:** Clears all previous session context. Use for a fresh audit start. |

### **How to use Shorthand in Claude/Cursor:**
You can combine flags for maximum precision.

> **Example:** *"@axiom /axm -a -t Verify the revenue growth for 2024 and 2025."*

*   **Result:** The Librarian performs a **Deep Audit** (doubled evidence pool), and the Architect renders the result in a **strictly formatted Markdown Table**.

### **The "Zero-Chatter" Protocol**
All Axiom command executions are **"Silent by Design."** The engine is instructed to ignore "Hello" or "Here is your report" preambles, focusing exclusively on the audit data. This ensures your output is ready for immediate copy-pasting into professional reports or PDF exports.

---

## The Power User's Setup (For developers)
If you are building your own integrations, Axiom Engine provides the following **Sovereign Tools** via the MCP Bridge:

*   `audit_local_document`: Analyzes any local file passed through the bridge.
*   `search_axiom_vault`: Executes hybrid semantic/keyword retrieval across your cloud vault.
*   `audit_code_implementation`: Cross-references your GitHub code against your PDF policy vault.
*   `upload_csv_dataset`: Ingests local spreadsheets into your secure JSONB database.
*   `audit_live_dataset`: Performs live math reconciliation between PDFs and your ledger database.

***

## Sovereign Agent Skills: User Guide

Axiom Engine isn't a general-purpose AI; it is a specialized auditing terminal. Once connected via the MCP Bridge, Claude gains access to five professional-grade "Skills." 

### **Skill 1: Code-to-Policy Compliance**
**When to use:** Use this to verify if your actual software code follows your written legal policies (e.g., GDPR, Security Policy, or Financial Logic).
*   **The Command:** *"Audit my local file `path/to/script.py` against my `Security_Policy.pdf` in the vault. Does the code correctly sanitize inputs?"*
*   **How it works:** Claude reads your local code file and sends the text to the Axiom Architect. The Architect then cross-references it with the rules found in your PDF vault.

### **Skill 2: Live Financial Reconciliation**
**When to use:** Use this when you have a local spreadsheet (CSV/Excel) and you want to verify its totals against a static report (PDF).
*   **The Procedure (2 Steps):**
    1.  **Ingest the Data:** *"Upload my local CSV at `C:/Ledgers/Q1_transactions.csv` and name the dataset 'Q1_Live'."*
    2.  **Audit the Discrepancy:** *"Now, audit the 'Q1_Live' dataset against my `Earnings_Report.pdf`. Identify any variances in the Cloud Revenue totals."*
*   **How it works:** Axiom securely maps your local CSV into a private, encrypted JSONB vault in the cloud, then performs a mathematical delta-check against the PDF claims.

### **Skill 3: Multi-Document Strategic Audit**
**When to use:** Use this to find contradictions or "loopholes" between two or more documents.
*   **The Command:** *"Run a comparative audit on `Master_Agreement.pdf` and `Latest_Amendment.pdf`. Highlight any clauses where the amendment conflicts with the original terms."*
*   **How it works:** This triggers the **Strategist Node**, which builds a side-by-side risk matrix of every conflicting clause.

### **Skill 4: Semantic Vault Interrogation**
**When to use:** Use this to find needles in a haystack across thousands of pages.
*   **The Command:** *"Search the Axiom vault for any mentions of 'Force Majeure' or 'Arbitration' across all my uploaded documents."*
*   **How it works:** Axiom performs a high-density 1024-D vector search to pull raw evidence even if the exact keywords don't match.

---

## Sovereign Audit Protocols

Axiom applies specialized frameworks based on your query:

*   **Financial Reconciliation:** Reconciles PDF claims against your live database to catch variances.
*   **Code-to-Policy Mapping:** Cross-references live GitHub code against regulatory PDFs to find implementation gaps.
*   **The Strategist (Map-Reduce):** When comparing 2+ documents, Axiom automatically builds a **Comparative Matrix** of risks and contradictions.
*   **LLM-as-a-Judge (Adversarial Verification):** Before you see any answer, our **Prosecutor Node** (powered by DeepSeek) grades the Architect's draft. If the draft contains a hallucinated number or a missing citation, the Prosecutor rejects the report, deducts points, and forces the Architect to rewrite it until it achieves a verified "Faithfulness Score."

---

## The Certified Deliverable (PDF Export)
Axiom Engine is designed for professionals who need to share results with stakeholders. Once an audit passes the Prosecutor's strict verification loop, the UI generates a **Certified Deliverable**.

*   **One-Click Export:** Download the entire audit—including complex financial data grids and Markdown tables—as a cleanly formatted, boardroom-ready PDF.
*   **The Cryptographic Seal:** Every exported PDF is stamped with Axiom's "Seal of Verification." It explicitly displays the **DeepSeek Faithfulness Score**, proving to whoever reads the document that the AI was mathematically supervised and did not hallucinate the data.

---

## ⚡ Real-Time Observability & The "Black Box"
Axiom Engine operates with 100% transparency. Enterprise users should never have to guess *how* an AI arrived at its conclusion.

1. **The Agentic Live-Stream:** As the engine thinks, the user interface streams the exact progress of the individual agents. You watch in real-time as the **Librarian** fetches evidence, the **Editor** cleans it, and the **Prosecutor** mathematically grades it.
2. **The LangSmith Flight Recorder:** Under the hood, Axiom Engine is wired into enterprise-grade telemetry via **LangSmith**. Every single "thought," retrieved document, and logic check is recorded in our secure cloud trace system. If an audit fails or contradicts a policy, our engineers can open the "Black Box" and see the exact mathematical pathway the AI took.

---
**Axiom Engine: Standard AI Guesses. Axiom Proves.**
*Proprietary. Cryptographically verified by the Sovereign Auditor.*
