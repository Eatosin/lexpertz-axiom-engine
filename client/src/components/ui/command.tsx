"use client";

// Re-export of the cmdk primitive wrapped to skip Server Component generated wrappers.
// This is small by design — adapter layer for project-theming.

import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";

export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={`flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent text-zinc-200 ${className}`}
    {...props}
  />
));
Command.displayName = "Command";

export { CommandPrimitive };
