import type { CSSProperties } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { currency, percent } from "@/lib/metrics/format";
import type { ExecutiveRankingItem } from "@/types/ranking";

interface RankingRowProps {
  item: ExecutiveRankingItem;
}

export function RankingRow({ item }: RankingRowProps) {
  const MovementIcon = item.movement > 0 ? ArrowUp : item.movement < 0 ? ArrowDown : Minus;
  const movementLabel = item.movement > 0 ? `Subio ${item.movement}` : item.movement < 0 ? `Bajo ${Math.abs(item.movement)}` : "Se mantiene";

  return (
    <div className={`ranking-row rank-${item.rank <= 3 ? item.rank : "normal"}`}>
      <div className="rank-position">#{item.rank}</div>
      <Avatar src={item.photoUrl} name={item.fullName} size="lg" />
      <div className="rank-person">
        <strong>{item.fullName}</strong>
        <span style={{ "--team-color": item.teamColor } as CSSProperties}>{item.teamName}</span>
      </div>
      <div>
        <strong>{item.totalQuantity}</strong>
        <span>ventas</span>
      </div>
      <div>
        <strong>{item.totalPoints}</strong>
        <span>puntos</span>
      </div>
      <div>
        <strong>{currency(item.totalAmount)}</strong>
        <span>monto</span>
      </div>
      <div>
        <strong>{percent(item.contributionPct)}</strong>
        <span>aporte</span>
      </div>
      <div className={`movement movement-${item.movement > 0 ? "up" : item.movement < 0 ? "down" : "flat"}`}>
        <MovementIcon size={16} />
        <span>{movementLabel}</span>
      </div>
    </div>
  );
}
