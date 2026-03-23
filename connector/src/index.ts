import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";

/**
 * Axiom Universal Connector v1.0.0
 * The "Thin Client" for Tier 2 SaaS Integration.
 */

// Your live Hugging Face API URL
const API_BASE_URL = "https://eatosin-axiom-engine-api.hf.space/api/v1"; 

const server = new McpServer({
  name: "Axiom Sovereign Connector",
  version: "1.0.0",
});

async function uploadAndAudit(filePath: string, question: string, apiKey: string) {
  try {
    if (!fs.existsSync(filePath)) {
      return `ERROR: Local file not found at ${filePath}`;
    }

    const fileStream = fs.createReadStream(filePath);
    const filename = path.basename(filePath);

    // 1. Sync local file to your Cloud Vault (Temporary Ingestion)
    const form = new FormData();
    form.append("file", fileStream);

    process.stderr.write(`[Axiom] Transmitting ${filename} to Cloud Vault...\n`);
    
    await axios.post(`${API_BASE_URL}/upload`, form, {
      headers: { 
        ...form.getHeaders(),
        "Authorization": `Bearer ${apiKey}` 
      }
    });

    // 2. Trigger the Sovereign Audit Circuit
    process.stderr.write(`[Axiom] Initializing Multi-Agent Audit...\n`);
    const auditRes = await axios.post(`${API_BASE_URL}/run/verify`, {
      question: question,
      filenames: [filename]
    }, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    return auditRes.data.answer;
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
    query: z.string().describe("The specific audit analysis or question"),
  },
  async ({ local_path, query }) => {
    const apiKey = process.env.AXIOM_API_KEY;
    if (!apiKey) return { content: [{ type: "text", text: "ERROR: AXIOM_API_KEY environment variable is missing." }] };

    const result = await uploadAndAudit(local_path, query, apiKey);
    return { content: [{ type: "text", text: result }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

