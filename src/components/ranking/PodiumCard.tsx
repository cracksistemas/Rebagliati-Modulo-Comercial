import { Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { currency } from "@/lib/metrics/format";
import type { ExecutiveRankingItem } from "@/types/ranking";

interface PodiumCardProps {
  item: ExecutiveRankingItem;
}

export function PodiumCard({ item }: PodiumCardProps) {
  return (
    <article className="podium-card">
      <Trophy size={20} />
      <Avatar src={item.photoUrl} name={item.fullName} size="lg" />
      <div>
        <strong>#{item.rank} {item.fullName}</strong>
        <span>{item.totalQuantity} ventas · {item.totalPoints} puntos · {currency(item.totalAmount)}</span>
      </div>
    </article>
  );
}
