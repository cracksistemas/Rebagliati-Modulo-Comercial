"use client";

import { HelpTooltip } from "./HelpTooltip";

type FieldLabelProps = {
  label: string;
  helpKey?: string;
};

export function FieldLabel({ label, helpKey }: FieldLabelProps) {
  return (
    <span className="field-label-with-help">
      <span>{label}</span>
      {helpKey ? <HelpTooltip helpKey={helpKey} /> : null}
    </span>
  );
}
