"use client";

import { CircleHelp, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { HELP_CONTENT } from "@/config/help-content";
import type { HelpContentItem, HelpPlacement } from "@/types/help";
import "./help.css";

type HelpTooltipProps = {
  helpKey?: string;
  content?: HelpContentItem;
  placement?: HelpPlacement;
  className?: string;
};

export function HelpTooltip({ helpKey, content, placement = "top", className = "" }: HelpTooltipProps) {
  const help = content ?? (helpKey ? HELP_CONTENT[helpKey] : undefined);
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (!help) return null;

  const variant = help.variant ?? "tooltip";

  return (
    <span
      ref={wrapperRef}
      className={`help-tooltip-wrapper help-placement-${placement} help-variant-${variant} ${open ? "is-open" : ""} ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="button"
        tabIndex={0}
        className="help-tooltip-trigger"
        aria-label={`Ayuda: ${help.title}`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <CircleHelp size={15} />
      </span>
      <span id={id} role="tooltip" className="help-tooltip-content">
        <span className="help-tooltip-header">
          <strong>{help.title}</strong>
          <span role="button" tabIndex={0} aria-label="Cerrar ayuda" onClick={() => setOpen(false)} onKeyDown={(event) => event.key === "Enter" && setOpen(false)}>
            <X size={12} />
          </span>
        </span>
        <span>{help.description}</span>
        {help.example ? <em>{help.example}</em> : null}
        {help.warning ? <small>{help.warning}</small> : null}
      </span>
    </span>
  );
}
