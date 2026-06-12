import { executives, productTypes, sales, teams } from "@/lib/data/mock-data";
import { getOfficialSales, getOfficialTotalAmount } from "@/lib/metrics/sales";
import type { ExecutiveRankingItem, TeamRankingItem } from "@/types/ranking";

export function getExecutiveRanking(): ExecutiveRankingItem[] {
  const officialSales = getOfficialSales();
  const totalAmount = getOfficialTotalAmount();

  const ranked = executives.map((executive) => {
    const executiveSales = officialSales.filter((sale) => sale.executiveId === executive.id);
    const team = teams.find((item) => item.id === executive.teamId);
    const totalQuantity = executiveSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalAmountByExecutive = executiveSales.reduce((sum, sale) => sum + sale.netAmount, 0);
    const totalPoints = executiveSales.reduce((sum, sale) => {
      const type = productTypes.find((item) => item.id === sale.productTypeId);
      return sum + sale.quantity * (type?.pointWeight ?? 0);
    }, 0);

    return {
      executiveId: executive.id,
      fullName: executive.fullName,
      photoUrl: executive.photoUrl,
      teamId: executive.teamId,
      teamName: team?.name ?? "Sin equipo",
      teamColor: team?.color ?? "#8E8E93",
      totalQuantity,
      totalAmount: totalAmountByExecutive,
      totalPoints,
      rank: 0,
      previousRank: executive.previousRank,
      movement: 0,
      contributionPct: totalAmount ? (totalAmountByExecutive / totalAmount) * 100 : 0
    };
  });

  return ranked
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) return right.totalPoints - left.totalPoints;
      return right.totalAmount - left.totalAmount;
    })
    .map((item, index) => {
      const rank = index + 1;
      return {
        ...item,
        rank,
        movement: item.previousRank - rank
      };
    });
}

export function getTeamRanking(): TeamRankingItem[] {
  const ranking = getExecutiveRanking();
  const officialSales = getOfficialSales();
  const companyTotal = getOfficialTotalAmount();

  return teams
    .map((team) => {
      const members = executives.filter((executive) => executive.teamId === team.id);
      const teamSales = officialSales.filter((sale) => sale.teamId === team.id);
      const totalQuantity = teamSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const totalAmount = teamSales.reduce((sum, sale) => sum + sale.netAmount, 0);
      const totalPoints = teamSales.reduce((sum, sale) => {
        const type = productTypes.find((item) => item.id === sale.productTypeId);
        return sum + sale.quantity * (type?.pointWeight ?? 0);
      }, 0);
      const leader = executives.find((executive) => executive.id === team.leaderId);
      const topExecutive = ranking.find((item) => item.teamId === team.id);

      return {
        teamId: team.id,
        name: team.name,
        color: team.color,
        leaderName: leader?.fullName ?? "Sin lider",
        members: members.length,
        totalQuantity,
        totalAmount,
        totalPoints,
        goalAmount: team.monthlyGoal,
        progressPct: team.monthlyGoal ? (totalAmount / team.monthlyGoal) * 100 : 0,
        contributionPct: companyTotal ? (totalAmount / companyTotal) * 100 : 0,
        topExecutiveName: topExecutive?.fullName ?? "Sin ventas"
      };
    })
    .sort((left, right) => right.totalPoints - left.totalPoints);
}

export function getValidationBuckets() {
  return {
    validada: sales.filter((sale) => sale.validationStatus === "validada").length,
    pendiente: sales.filter((sale) => sale.validationStatus === "pendiente_validacion").length,
    observada: sales.filter((sale) => sale.validationStatus === "observada").length,
    anulada: sales.filter((sale) => sale.validationStatus === "anulada").length
  };
}
