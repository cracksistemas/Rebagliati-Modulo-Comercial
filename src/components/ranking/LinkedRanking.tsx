"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { ExecutiveBattleCard } from "@/components/dashboard/ExecutiveBattleCard";
import { RankingTable } from "@/components/ranking/RankingTable";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getExecutiveRankingFromData, loadLinkedCommercialData, type LinkedCommercialData } from "@/lib/commercial/linked-data";

export function LinkedRanking() {
  const [data, setData] = useState<LinkedCommercialData | null>(null);

  useEffect(() => {
    const refresh = () => loadLinkedCommercialData().then(setData);
    refresh();
    return subscribeCommercialDataChange(refresh);
  }, []);

  const ranking = data ? getExecutiveRankingFromData(data) : [];

  return (
    <>
      <section className="card card-pad">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Filtros</p>
            <h2 style={{ margin: 0 }}>Ranking mensual consultable</h2>
          </div>
          <div className="action-cluster">
            <Button variant="secondary"><Filter size={17} /> Aplicar filtros</Button>
          </div>
        </div>
        <div className="section-grid grid-4" style={{ marginTop: 18 }}>
          <Select defaultValue="junio"> <option value="junio">Junio 2026</option> </Select>
          <Select defaultValue="mes"> <option value="mes">Mes</option><option>Semana</option> </Select>
          <Select defaultValue="todos"> <option value="todos">Todos los equipos</option> </Select>
          <Select defaultValue="validada"> <option value="validada">Validada</option><option>Pendiente</option><option>Observada</option> </Select>
        </div>
      </section>
      <ExecutiveBattleCard contenders={ranking.slice(0, 2)} />
      <RankingTable items={ranking} />
    </>
  );
}
