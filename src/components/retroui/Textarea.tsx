/**
 * Copyright (c) 2024 Arif Hossain
 *
 * RetroUI, from https://github.com/neobrutalism/neobrutalism
 * MIT License. Full notice: licenses/retroui/LICENCE.md
 */

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  placeholder = "Enter text...",
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return (
    <textarea
      placeholder={placeholder}
      rows={4}
      className={cn(
        "px-4 py-2 w-full border-2 bg-input rounded shadow-md transition focus:outline-hidden focus:shadow-xs placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
