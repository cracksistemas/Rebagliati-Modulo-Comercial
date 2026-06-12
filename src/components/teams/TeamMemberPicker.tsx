"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { executives, sales } from "@/lib/data/mock-data";

export function TeamMemberPicker() {
  const [selected, setSelected] = useState<string[]>(executives.slice(0, 2).map((executive) => executive.id));

  return (
    <div className="member-picker">
      {executives.map((executive) => {
        const checked = selected.includes(executive.id);
        const monthlySales = sales
          .filter((sale) => sale.executiveId === executive.id && sale.validationStatus === "validada")
          .reduce((sum, sale) => sum + sale.quantity, 0);

        return (
          <button
            className={`member-option ${checked ? "is-selected" : ""}`}
            key={executive.id}
            type="button"
            onClick={() => setSelected((current) => (checked ? current.filter((id) => id !== executive.id) : [...current, executive.id]))}
          >
            <Avatar src={executive.photoUrl} name={executive.fullName} size="sm" />
            <span>
              <strong>{executive.fullName}</strong>
              <small>{executive.shift} · {executive.status} · {monthlySales} ventas</small>
            </span>
            {checked ? <Check size={17} /> : null}
          </button>
        );
      })}
    </div>
  );
}
