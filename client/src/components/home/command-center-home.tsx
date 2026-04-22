"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";

// Import the Decoupled Components
import { WelcomeTelemetry } from "./welcome-telemetry";
import { ActionBento } from "./action-bento";
import { AcademySection } from "./academy-section";
import { RecentVault } from "./recent-vault";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const CommandCenterHome = () => {
  // Global Router State
  const [, setContexts] = useQueryState("contexts", parseAsArrayOf(parseAsString).withDefault([]));

  const handleUploadComplete = (filename: string, eta: number) => {
    setContexts([filename]);
  };

  const handleInterrogate = (filename: string) => {
    setContexts([filename]);
  };

  return (
    <motion.div 
      className="flex-1 w-full overflow-y-auto custom-scrollbar p-6 md:p-8 lg:p-12 pb-24"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="max-w-6xl mx-auto space-y-10">
        <motion.div variants={itemVariants}><WelcomeTelemetry /></motion.div>
        <motion.div variants={itemVariants}><ActionBento onUploadComplete={handleUploadComplete} /></motion.div>
        <motion.div variants={itemVariants}><AcademySection /></motion.div>
        <motion.div variants={itemVariants}><RecentVault onInterrogate={handleInterrogate} /></motion.div>
      </div>
    </motion.div>
  );
};
