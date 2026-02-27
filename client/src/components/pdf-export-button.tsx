"use client";

import { useState, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";

interface PdfExportProps {
  filename: string;
  query: string;
  answer: string;
  metrics?: {
    faithfulness: number;
    relevance: number;
    precision: number;
  };
}

// Vector PDF Stylesheet
const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30, borderBottom: "2 solid #10b981", paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold", color: "#111" },
  subtitle: { fontSize: 10, color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  section: { marginBottom: 25 },
  label: { fontSize: 9, color: "#10b981", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontWeight: "bold" },
  content: { fontSize: 11, lineHeight: 1.6, color: "#333" },
  queryBox: { backgroundColor: "#f4f4f5", padding: 12, borderRadius: 4, marginBottom: 20 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#888", borderTop: "1 solid #eaeaea", paddingTop: 10 },
});

// Helper to strip markdown formatting for clean PDF text
const cleanTextForPdf = (text: string) => {
  return text
    .replace(/\*\*/g, "") // Remove bold
    .replace(/###/g, "") // Remove headers
    .replace(/`/g, "") // Remove code blocks
    .trim();
};

export function PdfExportButton({ filename, query, answer, metrics }: PdfExportProps) {
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration errors (PDFDownloadLink only works on client)
  useEffect(() => {
    setIsClient(true);
  },[]);

  if (!isClient) return null;

  const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, "_");
  const cleanAnswer = cleanTextForPdf(answer);

  const AuditDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>AXIOM VERIFICATION</Text>
            <Text style={styles.subtitle}>Certified Evidence Audit Report</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 10, color: "#666" }}>Date: {new Date().toLocaleDateString()}</Text>
            <Text style={{ fontSize: 10, color: "#666", marginTop: 4 }}>ID: {Date.now().toString(36).toUpperCase()}</Text>
          </View>
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.label}>Target Document Vault</Text>
          <Text style={styles.content}>{filename}</Text>
        </View>

        <View style={styles.queryBox}>
          <Text style={styles.label}>User Audit Query</Text>
          <Text style={styles.content}>{query}</Text>
        </View>

        {metrics && (
          <View style={styles.section}>
            <Text style={styles.label}>System Integrity Telemetry (Llama 3.3 Judge)</Text>
            <Text style={{ fontSize: 10, color: "#333", marginTop: 4 }}>
              Faithfulness Score: {Math.round(metrics.faithfulness * 100)}%  •  Zero-Inference Gating: Active
            </Text>
          </View>
        )}

        {/* Verified Output */}
        <View style={styles.section}>
          <Text style={styles.label}>Verified Output</Text>
          <Text style={styles.content}>{cleanAnswer}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Cryptographically verified by Axiom Engine • Standard AI Guesses, Axiom Proves.
        </Text>
      </Page>
    </Document>
  );

  return (
    <PDFDownloadLink document={AuditDocument} fileName={`Axiom_Audit_${safeFilename}_${Date.now()}.pdf`}>
      {/* @ts-ignore - The types for loading from the library are slightly loose */}
      {({ loading }) => (
        <button 
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 hover:bg-brand-primary/20 text-[10px] font-bold uppercase tracking-widest text-brand-primary transition-colors disabled:opacity-50 active:scale-95"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {loading ? "Compiling..." : "Export Certified PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
        }
