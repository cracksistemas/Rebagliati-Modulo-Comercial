"use client";

import { HelpTooltip } from "./HelpTooltip";

type HelpPopoverProps = {
  helpKey: string;
};

export function HelpPopover({ helpKey }: HelpPopoverProps) {
  return <HelpTooltip helpKey={helpKey} placement="right" />;
}
