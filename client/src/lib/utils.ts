import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn (Class Name Merger)
 * Mathematically resolves Tailwind class conflicts dynamically.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Enterprise Error Parser (V4.6 SOTA)
 * Safely extracts human-readable strings from unknown API/Network errors.
 * Prevents Next.js 16 Server Components from throwing unhandled boundary crashes.
 */
export function parseApiError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "detail" in error) {
    return String((error as any).detail);
  }
  return "An unknown sovereign anomaly occurred.";
}

/**
 * formatCurrency
 * Professional financial formatting for Audit Reports & Dashboards.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * truncateText
 * Safely truncates evidence snippets for UI previews to prevent layout breaking.
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}
