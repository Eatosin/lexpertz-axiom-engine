"use client";

import { forwardRef, useCallback } from "react";
import { 
  motion, 
  useMotionValue, 
  useSpring, 
  useTransform, 
  useMotionTemplate,
  HTMLMotionProps 
} from "framer-motion";
import { cn } from "@/lib/utils";

// Extends native Framer Motion props to allow onClick, layoutId, variants, etc.
export interface SkeuoCardProps extends HTMLMotionProps<"div"> {
  glowColor?: string;
  glowSize?: number;
  tiltIntensity?: number;
}

/**
 * SkeuoCard
 * A highly reusable, physics-based UI primitive with inner bevels and a dynamic mouse-tracking glow.
 * Built with `useMotionTemplate` for 60fps render performance.
 */
export const SkeuoCard = forwardRef<HTMLDivElement, SkeuoCardProps>(
  (
    { 
      children, 
      className, 
      glowColor = "rgba(16, 185, 129, 0.15)", // Defaults to Axiom Emerald
      glowSize = 600, 
      tiltIntensity = 5, 
      onMouseMove, 
      onMouseLeave, 
      ...props 
    }, 
    ref
  ) => {
    // Normalized coordinates: [-0.5, 0.5]
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Spring physics configuration
    const springConfig = { stiffness: 300, damping: 30 };
    const mouseX = useSpring(x, springConfig);
    const mouseY = useSpring(y, springConfig);

    // 3D Tilt: Mouse position dynamically dictates rotation degrees
    const rotateX = useTransform(mouseY, [-0.5, 0.5],[tiltIntensity, -tiltIntensity]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5],[-tiltIntensity, tiltIntensity]);

    // Spotlight Mapping: Convert [-0.5, 0.5] into a percentage[0%, 100%]
    const spotlightX = useTransform(mouseX,[-0.5, 0.5], [0, 100]);
    const spotlightY = useTransform(mouseY,[-0.5, 0.5], [0, 100]);
    
    // High-performance CSS template string (Runs outside React's render cycle)
    const dynamicBackground = useMotionTemplate`radial-gradient(${glowSize}px circle at ${spotlightX}% ${spotlightY}%, ${glowColor}, transparent 40%)`;

    const handleMouseMove = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Calculate relative position and normalize to [-0.5, 0.5]
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        
        x.set(localX / rect.width - 0.5);
        y.set(localY / rect.height - 0.5);

        // Preserve external onMouseMove handlers if passed via props
        if (onMouseMove) onMouseMove(event);
      },
      [x, y, onMouseMove]
    );

    const handleMouseLeave = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        // Snap back to resting state
        x.set(0);
        y.set(0);
        
        if (onMouseLeave) onMouseLeave(event);
      },[x, y, onMouseLeave]
    );

    return (
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ 
          rotateX, 
          rotateY, 
          perspective: 1000,
          transformStyle: "preserve-3d" 
        }}
        className={cn(
          "relative rounded-[32px] bg-surface border border-white/5 group overflow-hidden transition-colors duration-500",
          "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_30px_rgba(0,0,0,0.4)]",
          className
        )}
        {...props}
      >
        {/* Dynamic Light Leak (Powered by useMotionTemplate) */}
        <motion.div
          className="pointer-events-none absolute -inset-px z-10 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: dynamicBackground }}
        />

        {/* Industrial Inner Highlight (Top Edge Bevel) */}
        <div className="absolute inset-0 border-t border-white/[0.08] rounded-[32px] pointer-events-none z-20" />
        
        {/* Content Container */}
        <div className="relative z-30 h-full w-full">
          {children}
        </div>
      </motion.div>
    );
  }
);

SkeuoCard.displayName = "SkeuoCard";
