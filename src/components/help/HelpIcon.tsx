"use client";

import { CircleHelp } from "lucide-react";

export function HelpIcon({ size = 15 }: { size?: number }) {
  return <CircleHelp size={size} aria-hidden="true" />;
}
