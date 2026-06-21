export type HelpVariant = "tooltip" | "popover";

export type HelpPlacement = "top" | "right" | "bottom" | "left";

export type HelpContentItem = {
  title: string;
  description: string;
  example?: string;
  warning?: string;
  variant?: HelpVariant;
};
