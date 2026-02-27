"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface ScanlineOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * ScanlineOverlay
 * Pure CSS retro-futuristic CRT monitor effect. 
 * Memoized to prevent unnecessary re-renders in the React tree.
 */
export const ScanlineOverlay = memo(function ScanlineOverlay({ 
  className, 
  ...props 
}: ScanlineOverlayProps) {
  return (
    <div 
      className={cn("pointer-events-none fixed inset-0 z-[100]", className)}
      aria-hidden="true" // A11y: Hide from screen readers as it's purely decorative
      {...props}
    >
      {/* 1. The Moving Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
      
      {/* 2. The CRT Flickering Animation */}
      <div className="absolute inset-0 animate-pulse-slow opacity-[0.02] bg-white pointer-events-none" />

      {/* 3. The Industrial Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] pointer-events-none" />
    </div>
  );
});
