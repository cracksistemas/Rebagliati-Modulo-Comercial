import { monthlyGoals } from "@/lib/data/mock-data";
import { getOfficialTotalAmount } from "@/lib/metrics/sales";

export function getCompanyGoal() {
  return monthlyGoals.find((goal) => goal.scope === "company") ?? monthlyGoals[0];
}

export function getCompanyGoalProgress() {
  const goal = getCompanyGoal();
  const accumulated = getOfficialTotalAmount();
  const progressPct = goal.goalAmount ? (accumulated / goal.goalAmount) * 100 : 0;

  return {
    goalAmount: goal.goalAmount,
    accumulated,
    progressPct,
    gap: Math.max(goal.goalAmount - accumulated, 0)
  };
}

export function getProgressTone(value: number) {
  if (value >= 100) return "success";
  if (value >= 71) return "accent";
  if (value >= 41) return "warning";
  return "danger";
}
