export function currency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0
  }).format(value);
}

export function number(value: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 0
  }).format(value);
}

export function percent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}
