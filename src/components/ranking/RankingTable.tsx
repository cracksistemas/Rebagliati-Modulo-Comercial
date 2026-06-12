import type { ExecutiveRankingItem } from "@/types/ranking";
import { RankingRow } from "@/components/ranking/RankingRow";

interface RankingTableProps {
  items: ExecutiveRankingItem[];
}

export function RankingTable({ items }: RankingTableProps) {
  return (
    <section className="card card-pad ranking-table">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Ranking individual</p>
          <h2>Ejecutivos por puntos oficiales</h2>
        </div>
        <span className="pill">Solo ventas validadas</span>
      </div>
      <div className="ranking-list">
        {items.map((item) => (
          <RankingRow item={item} key={item.executiveId} />
        ))}
      </div>
    </section>
  );
}
