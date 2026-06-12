import type { CSSProperties } from "react";
import { currency, percent } from "@/lib/metrics/format";
import { getProgressTone } from "@/lib/metrics/goals";

interface GoalProgressProps {
  goalAmount: number;
  accumulated: number;
  progressPct: number;
  gap: number;
}

export function GoalProgress({ goalAmount, accumulated, progressPct, gap }: GoalProgressProps) {
  const tone = getProgressTone(progressPct);
  const clamped = Math.min(progressPct, 100);

  return (
    <article className="card card-pad goal-card">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Meta mensual</p>
          <h2>{currency(goalAmount)}</h2>
        </div>
        <div className={`goal-ring ring-${tone}`} style={{ "--ring-value": `${clamped * 3.6}deg` } as CSSProperties}>
          <span>{percent(progressPct, 1)}</span>
        </div>
      </div>
      <div className="goal-progress-bar" aria-label="Avance a meta">
        <span className={`bar-${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <div className="goal-metrics">
        <div>
          <span>Acumulado</span>
          <strong>{currency(accumulated)}</strong>
        </div>
        <div>
          <span>Brecha</span>
          <strong>{currency(gap)}</strong>
        </div>
        <div>
          <span>Avance</span>
          <strong>{percent(progressPct, 2)}</strong>
        </div>
      </div>
    </article>
  );
}
