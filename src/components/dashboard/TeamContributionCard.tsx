import type { CSSProperties } from "react";
import { Crown } from "lucide-react";
import { currency, percent } from "@/lib/metrics/format";
import type { TeamRankingItem } from "@/types/ranking";

interface TeamContributionCardProps {
  team: TeamRankingItem;
}

export function TeamContributionCard({ team }: TeamContributionCardProps) {
  return (
    <article className="team-card-mini" style={{ "--team-color": team.color } as CSSProperties}>
      <div className="team-card-top">
        <span />
        <strong>{team.name}</strong>
      </div>
      <p>Lider: {team.leaderName}</p>
      <div className="mini-stats">
        <div>
          <span>Acumulado</span>
          <strong>{currency(team.totalAmount)}</strong>
        </div>
        <div>
          <span>Aporte</span>
          <strong>{percent(team.contributionPct)}</strong>
        </div>
      </div>
      <div className="team-bar">
        <span style={{ width: `${Math.min(team.progressPct, 100)}%` }} />
      </div>
      <p className="team-top">
        <Crown size={15} /> {team.topExecutiveName}
      </p>
    </article>
  );
}
