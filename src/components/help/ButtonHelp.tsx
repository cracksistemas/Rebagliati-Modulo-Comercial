"use client";

import { HelpTooltip } from "./HelpTooltip";

type ButtonHelpProps = {
  helpKey: string;
};

export function ButtonHelp({ helpKey }: ButtonHelpProps) {
  return <HelpTooltip helpKey={helpKey} className="button-help" />;
}
