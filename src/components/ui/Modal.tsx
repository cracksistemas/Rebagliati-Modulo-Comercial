"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  hideHeader?: boolean;
  variant?: "default" | "executive";
}

export function Modal({ open, title, description, children, onClose, hideHeader = false, variant = "default" }: ModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className={`modal-panel modal-panel-${variant} fade-in`} role="dialog" aria-modal="true" aria-label={title}>
        {!hideHeader ? (
          <div className="modal-header">
            <div>
              <p className="eyebrow">Accion comercial</p>
              <h2>{title}</h2>
              {description ? <p>{description}</p> : null}
            </div>
            <Button variant="ghost" onClick={onClose} aria-label="Cerrar modal">
              <X size={18} />
            </Button>
          </div>
        ) : null}
        {children}
      </section>
    </div>
  );
}
