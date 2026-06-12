import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { currency, percent } from "@/lib/metrics/format";
import type { ExecutiveRankingItem } from "@/types/ranking";

interface ExecutiveBattleCardProps {
  contenders: ExecutiveRankingItem[];
}

export function ExecutiveBattleCard({ contenders }: ExecutiveBattleCardProps) {
  const [first, second] = contenders;
  if (!first || !second) {
    return (
      <article className="card card-pad battle-card">
        <div className="toolbar">
          <div>
            <p className="eyebrow">ExecutiveBattleCard</p>
            <h2>Duelo por el primer puesto</h2>
          </div>
          <span className="pill">Esperando ranking</span>
        </div>
        <div className="empty-battle">
          Registra y valida ventas para comparar los dos primeros puestos.
        </div>
      </article>
    );
  }

  const total = (first?.totalAmount ?? 0) + (second?.totalAmount ?? 0);
  const firstPct = total ? ((first?.totalAmount ?? 0) / total) * 100 : 0;
  const secondPct = total ? ((second?.totalAmount ?? 0) / total) * 100 : 0;

  return (
    <article className="card card-pad battle-card">
      <div className="toolbar">
        <div>
          <p className="eyebrow">ExecutiveBattleCard</p>
          <h2>Duelo por el primer puesto</h2>
        </div>
        <span className="pill">Top 2 oficial</span>
      </div>
      <div className="battle-grid">
        {[first, second].map((contender, index) => {
          const percentage = index === 0 ? firstPct : secondPct;
          return (
            <div className="battle-side" key={contender.executiveId}>
              <div className="battle-ring" style={{ "--ring-value": `${percentage * 3.6}deg` } as CSSProperties}>
                <Avatar src={contender.photoUrl} name={contender.fullName} size="xl" />
              </div>
              <strong>{percent(percentage, 3)}</strong>
              <h3>{contender.fullName}</h3>
              <p>{contender.totalQuantity} ventas / {contender.totalPoints} puntos</p>
              <span>{currency(contender.totalAmount)}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
