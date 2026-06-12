export interface ExecutiveRankingItem {
  executiveId: string;
  fullName: string;
  photoUrl: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  totalQuantity: number;
  totalAmount: number;
  totalPoints: number;
  rank: number;
  previousRank: number;
  movement: number;
  contributionPct: number;
}

export interface TeamRankingItem {
  teamId: string;
  name: string;
  color: string;
  leaderName: string;
  members: number;
  totalQuantity: number;
  totalAmount: number;
  totalPoints: number;
  goalAmount: number;
  progressPct: number;
  contributionPct: number;
  topExecutiveName: string;
}

export interface ProductMixItem {
  code: string;
  name: string;
  totalAmount: number;
  totalQuantity: number;
  percentage: number;
}
