"use client";

import { HELP_CONTENT } from "@/config/help-content";

export function getHelpContent(helpKey: string) {
  return HELP_CONTENT[helpKey];
}
