import type { CSSProperties } from "react";
import { BarChart3, ListChecks, Pencil, PieChart, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { currency, percent } from "@/lib/metrics/format";
import type { TeamRankingItem } from "@/types/ranking";

interface TeamCardProps {
  team: TeamRankingItem;
  onEdit?: () => void;
}

export function TeamCard({ team, onEdit }: TeamCardProps) {
  return (
    <article className="team-card" style={{ "--team-color": team.color } as CSSProperties}>
      <div className="team-header">
        <span />
        <div>
          <h3>{team.name}</h3>
          <p>Lider: {team.leaderName}</p>
        </div>
        {onEdit ? (
          <Button className="team-header-edit" variant="ghost" onClick={onEdit} aria-label={`Editar ${team.name}`}>
            <Pencil size={16} />
          </Button>
        ) : null}
      </div>
      <div className="team-kpis">
        <div>
          <span>Integrantes</span>
          <strong>{team.members}</strong>
        </div>
        <div>
          <span>Acumulado</span>
          <strong>{currency(team.totalAmount)}</strong>
        </div>
        <div>
          <span>Puntos</span>
          <strong>{team.totalPoints}</strong>
        </div>
        <div>
          <span>Aporte al total</span>
          <strong>{percent(team.contributionPct)}</strong>
        </div>
      </div>
      <div className="team-progress">
        <div className="toolbar">
          <span>Avance a meta</span>
          <strong>{percent(team.progressPct)}</strong>
        </div>
        <div className="team-bar">
          <span style={{ width: `${Math.min(team.progressPct, 100)}%` }} />
        </div>
      </div>
      <div className="team-actions">
        {onEdit ? <Button variant="secondary" onClick={onEdit}><Pencil size={16} /> Editar nombre/color</Button> : null}
        <Button variant="ghost"><UsersRound size={16} /> Integrantes</Button>
        <Button variant="ghost"><ListChecks size={16} /> Ventas</Button>
        <Button variant="ghost"><BarChart3 size={16} /> Ranking</Button>
        <Button variant="ghost"><PieChart size={16} /> Mix</Button>
      </div>
    </article>
  );
}
