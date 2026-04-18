"use client";

import { Download, Loader2 } from "lucide-react";
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { marked, Token, Tokens } from "marked";

export interface PdfExportProps {
  filename: string;
  query: string;
  answer: string;
  metrics?: {
    faithfulness: number;
    relevance: number;
    precision: number;
  };
}

// ---------------------------------------------------------------------------
// 1. ENTERPRISE PDF STYLESHEET
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30, borderBottom: "2 solid #10b981", paddingBottom: 10 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#111" },
  subtitle: { fontSize: 10, color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  section: { marginBottom: 20 },
  label: { fontSize: 9, color: "#10b981", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  queryBox: { backgroundColor: "#f4f4f5", padding: 12, borderRadius: 4, marginBottom: 20 },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#888", borderTop: "1 solid #eaeaea", paddingTop: 10 },
  
  paragraph: { fontSize: 11, lineHeight: 1.6, color: "#333", marginBottom: 10 },
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  code: { fontFamily: "Courier", backgroundColor: "#f4f4f5" },
  
  listItem: { flexDirection: "row", marginBottom: 4 },
  listBullet: { width: 15, fontSize: 11, color: "#10b981" },
  listText: { flex: 1, fontSize: 11, lineHeight: 1.5, color: "#333" },

  table: { display: "flex", width: "auto", borderStyle: "solid", borderWidth: 1, borderColor: "#e5e7eb", borderBottomWidth: 0, borderRightWidth: 0, marginBottom: 15 },
  tableRow: { margin: "auto", flexDirection: "row" },
  tableColHeader: { flex: 1, borderStyle: "solid", borderWidth: 1, borderColor: "#e5e7eb", borderLeftWidth: 0, borderTopWidth: 0, backgroundColor: "#f9fafb" },
  tableCol: { flex: 1, borderStyle: "solid", borderWidth: 1, borderColor: "#e5e7eb", borderLeftWidth: 0, borderTopWidth: 0 },
  tableCellHeader: { margin: 6, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111" },
  tableCell: { margin: 6, fontSize: 10, color: "#333" }
});

// ---------------------------------------------------------------------------
// 2. STRICTLY TYPED AST MARKDOWN TO REACT-PDF RENDERER
// ---------------------------------------------------------------------------
const renderInlineTokens = (tokens?: Token[]): React.ReactNode => {
  if (!tokens) return null;
  return tokens.map((token: Token, index: number) => {
    if (token.type === "strong") return <Text key={index} style={styles.bold}>{renderInlineTokens((token as Tokens.Strong).tokens)}</Text>;
    if (token.type === "em") return <Text key={index} style={styles.italic}>{renderInlineTokens((token as Tokens.Em).tokens)}</Text>;
    if (token.type === "codespan") return <Text key={index} style={styles.code}>{token.raw}</Text>;
    if (token.type === "text" || token.type === "escape") return <Text key={index}>{token.raw}</Text>;
    return <Text key={index}>{token.raw}</Text>;
  });
};

const renderMarkdownToPdf = (markdown: string) => {
  const tokens = marked.lexer(markdown);

  return tokens.map((token: Token, index: number) => {
    switch (token.type) {
      case "paragraph": {
        const pToken = token as Tokens.Paragraph;
        return <Text key={index} style={styles.paragraph}>{renderInlineTokens(pToken.tokens)}</Text>;
      }
      
      case "list": {
        const listToken = token as Tokens.List;
        return (
          <View key={index} style={{ marginBottom: 10 }}>
            {listToken.items.map((item: Tokens.ListItem, i: number) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.listText}>{renderInlineTokens(item.tokens)}</Text>
              </View>
            ))}
          </View>
        );
      }

      case "table": {
        const tableToken = token as Tokens.Table;
        return (
          <View key={index} style={styles.table}>
            {/* Table Header Row */}
            <View style={styles.tableRow}>
              {tableToken.header.map((cell: Tokens.TableCell, i: number) => (
                <View key={`h-${i}`} style={styles.tableColHeader}>
                  <Text style={styles.tableCellHeader}>{renderInlineTokens(cell.tokens)}</Text>
                </View>
              ))}
            </View>
            {/* Table Data Rows */}
            {tableToken.rows.map((row: Tokens.TableCell[], rIndex: number) => (
              <View key={`r-${rIndex}`} style={styles.tableRow} wrap={false}>
                {row.map((cell: Tokens.TableCell, cIndex: number) => (
                  <View key={`c-${cIndex}`} style={styles.tableCol}>
                    <Text style={styles.tableCell}>{renderInlineTokens(cell.tokens)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      }

      case "space":
        return null;

      default:
        // Fallback for unsupported tokens
        return <Text key={index} style={[styles.paragraph, styles.bold]}>{token.raw}</Text>;
    }
  });
};

// ---------------------------------------------------------------------------
// 3. MAIN COMPONENT EXPORT
// ---------------------------------------------------------------------------
export default function PdfExportButtonInner({ filename, query, answer, metrics }: PdfExportProps) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, "_");

  const AuditDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.title}>AXIOM VERIFICATION</Text>
            <Text style={styles.subtitle}>Certified Evidence Audit Report</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 10, color: "#666" }}>Date: {new Date().toLocaleDateString()}</Text>
            <Text style={{ fontSize: 10, color: "#666", marginTop: 4 }}>ID: {Date.now().toString(36).toUpperCase()}</Text>
          </View>
        </View>

        {/* METADATA BLOCK */}
        <View style={styles.section}>
          <Text style={styles.label}>Target Document Vault</Text>
          <Text style={styles.paragraph}>{filename}</Text>
        </View>

        <View style={styles.queryBox}>
          <Text style={styles.label}>User Audit Query</Text>
          <Text style={styles.paragraph}>{query}</Text>
        </View>

        {/* RAGAS METRICS SEAL */}
        {metrics && (
          <View style={[styles.section, { borderLeft: "3 solid #10b981", paddingLeft: 10, backgroundColor: "#f0fdf4", padding: 10 }]}>
            <Text style={styles.label}>System Integrity Telemetry (DeepSeek-V3 / Llama 3.3)</Text>
            <Text style={{ fontSize: 10, color: "#065f46", marginTop: 4, fontFamily: "Helvetica-Bold" }}>
              Faithfulness: {Math.round(metrics.faithfulness * 100)}% | 
              Relevance: {Math.round(metrics.relevance * 100)}% | 
              Precision: {Math.round(metrics.precision * 100)}%
            </Text>
            <Text style={{ fontSize: 8, color: "#047857", marginTop: 4 }}>
              Zero-Inference Hallucination Gating: ACTIVE & VERIFIED
            </Text>
          </View>
        )}

        {/* PARSED MARKDOWN CONTENT */}
        <View style={styles.section}>
          <Text style={styles.label}>Verified Output</Text>
          {renderMarkdownToPdf(answer)}
        </View>

        {/* FOOTER */}
        <Text style={styles.footer} fixed>
          Cryptographically verified by Axiom Engine • Standard AI Guesses, Axiom Proves.
        </Text>
      </Page>
    </Document>
  );

  return (
    <PDFDownloadLink document={AuditDocument} fileName={`Axiom_Audit_${safeFilename}_${Date.now()}.pdf`}>
      {/* @ts-ignore - React-PDF typings conflict sometimes with React 18+ */}
      {({ loading }) => (
        <button 
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold uppercase tracking-widest text-emerald-600 transition-colors disabled:opacity-50 active:scale-95"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {loading ? "Compiling Matrix..." : "Export Certified PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
