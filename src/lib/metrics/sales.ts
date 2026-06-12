import { productTypes, sales } from "@/lib/data/mock-data";
import type { ProductMixItem } from "@/types/ranking";
import type { SaleStatus } from "@/types/sales";

export const officialStatuses: SaleStatus[] = ["validada"];

export function getOfficialSales() {
  return sales.filter((sale) => officialStatuses.includes(sale.validationStatus));
}

export function getPendingValidationCount() {
  return sales.filter((sale) => ["pendiente_validacion", "registrada", "observada"].includes(sale.validationStatus)).length;
}

export function getOfficialTotalAmount() {
  return getOfficialSales().reduce((total, sale) => total + sale.netAmount, 0);
}

export function getOfficialTotalQuantity() {
  return getOfficialSales().reduce((total, sale) => total + sale.quantity, 0);
}

export function getOfficialTotalPoints() {
  return getOfficialSales().reduce((total, sale) => {
    const type = productTypes.find((item) => item.id === sale.productTypeId);
    return total + sale.quantity * (type?.pointWeight ?? 0);
  }, 0);
}

export function getProductMix(): ProductMixItem[] {
  const officialSales = getOfficialSales();
  const total = officialSales.reduce((sum, sale) => sum + sale.netAmount, 0);

  return productTypes.map((type) => {
    const items = officialSales.filter((sale) => sale.productTypeId === type.id);
    const totalAmount = items.reduce((sum, sale) => sum + sale.netAmount, 0);
    const totalQuantity = items.reduce((sum, sale) => sum + sale.quantity, 0);

    return {
      code: type.code,
      name: type.name,
      totalAmount,
      totalQuantity,
      percentage: total ? (totalAmount / total) * 100 : 0
    };
  });
}

export function getDailyAccumulatedSales() {
  const byDate = getOfficialSales().reduce<Record<string, number>>((acc, sale) => {
    acc[sale.saleDate] = (acc[sale.saleDate] ?? 0) + sale.netAmount;
    return acc;
  }, {});

  let running = 0;
  return Object.entries(byDate)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, amount]) => {
      running += amount;
      return { date, amount: running };
    });
}
