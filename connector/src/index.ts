import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";

/**
 * Axiom Universal Connector v4.6.0
 * The "Thin Client" for Sovereign SaaS Integration.
 * Upgraded with Async Polling and SSE Stream Extraction.
 */

const API_BASE_URL = "https://eatosin-axiom-engine-api.hf.space/api/v1"; 

const server = new McpServer({
  name: "Axiom Sovereign Connector",
  version: "4.6.0",
});

// Helper for polling delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadAndAudit(filePath: string, question: string, apiKey: string) {
  try {
    if (!fs.existsSync(filePath)) {
      return `ERROR: Local file not found at ${filePath}`;
    }

    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append("file", fileStream);

    // 1. TRANSMISSION: Sync local file to Cloud Vault
    process.stderr.write(`[Axiom] Transmitting file to Cloud Vault...\n`);
    const uploadRes = await axios.post(`${API_BASE_URL}/upload`, form, {
      headers: { ...form.getHeaders(), "Authorization": `Bearer ${apiKey}` }
    });
    
    // We use the exact filename the server registered
    const serverFilename = uploadRes.data.filename;

    // 2. OBSERVABILITY: Poll the status until Docling finishes
    process.stderr.write(`[Axiom] Normalizing & Vectorizing Evidence (Docling V2)...\n`);
    let isIndexed = false;
    let attempts = 0;
    const maxAttempts = 40; // 2 minutes max wait

    while (!isIndexed && attempts < maxAttempts) {
      await sleep(3000); // Poll every 3 seconds
      const safeFilename = encodeURIComponent(serverFilename);
      const statusRes = await axios.get(`${API_BASE_URL}/status/${safeFilename}`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });

      const currentStatus = statusRes.data.status;
      if (currentStatus === "indexed") {
        isIndexed = true;
      } else if (currentStatus === "error") {
        return `AXIOM_CLOUD_ERROR: Backend failed to parse the PDF.`;
      }
      attempts++;
    }

    if (!isIndexed) return `AXIOM_CLOUD_ERROR: Ingestion timed out.`;

    // 3. INTERROGATION: Trigger the Sovereign Audit Circuit
    process.stderr.write(`[Axiom] Initializing Agentic Audit Circuit...\n`);
    const auditRes = await axios.post(`${API_BASE_URL}/verify`, {
      question: question,
      filenames: [serverFilename]
    }, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      // Axios will buffer the SSE stream until the connection closes
      responseType: 'text' 
    });

    // 4. SSE EXTRACTION: Parse the text stream to find the final payload
    const sseData = auditRes.data as string;
    const lines = sseData.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "event: audit_complete") {
        const payloadStr = lines[i + 1]?.replace("data:", "").trim();
        if (payloadStr) {
          const parsed = JSON.parse(payloadStr);
          process.stderr.write(`[Axiom] Audit Complete.\n`);
          return parsed.answer;
        }
      }
      if (lines[i].trim() === "event: error") {
        const errStr = lines[i + 1]?.replace("data:", "").trim();
        if (errStr) return `AXIOM_LOGIC_BREACH: ${JSON.parse(errStr).detail}`;
      }
    }

    return "AXIOM_CLOUD_ERROR: Stream ended prematurely without an answer.";

  } catch (error: any) {
    const errorMsg = error.response?.data?.detail || error.message;
    return `AXIOM_CLOUD_ERROR: ${errorMsg}`;
  }
}

// --- REGISTER TOOL: Local Audit ---
server.tool(
  "audit_local_document",
  "Audits a local file (PDF) using the Axiom Cloud Engine. Use this for legal/financial analysis.",
  {
    local_path: z.string().describe("The absolute path to the file on your computer"),
    query: z.string().describe("The specific audit analysis or question, including any /axm shorthand"),
  },
  async ({ local_path, query }) => {
    const apiKey = process.env.AXIOM_API_KEY;
    if (!apiKey) return { content:[{ type: "text", text: "ERROR: AXIOM_API_KEY environment variable is missing." }] };

    const result = await uploadAndAudit(local_path, query, apiKey);
    return { content: [{ type: "text", text: result }] };
  }
);

// Launch Stdio Transport for Claude Desktop Integration
const transport = new StdioServerTransport();
await server.connect(transport);
