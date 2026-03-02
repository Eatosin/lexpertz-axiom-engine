import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn (Class Name Merger)
 * The standard Axiom utility for conditional class merging.
 * Uses `clsx` for logic and `tailwind-merge` to prevent style collisions.
 * 
 * SOTA Fix: Crucial for V3.0 skeuomorphism where multiple 
 * shadow/border classes frequently overlap.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatCurrency
 * Professional financial formatting for Audit Reports.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
}

/**
 * truncateText
 * Safely truncates evidence snippets for UI previews.
 */
export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + "...";
}
