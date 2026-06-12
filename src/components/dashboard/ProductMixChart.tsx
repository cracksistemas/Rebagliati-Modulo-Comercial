import { currency, percent } from "@/lib/metrics/format";
import type { ProductMixItem } from "@/types/ranking";

interface ProductMixChartProps {
  items: ProductMixItem[];
}

export function ProductMixChart({ items }: ProductMixChartProps) {
  return (
    <article className="card card-pad product-card">
      <p className="eyebrow">Distribucion por tipo de producto</p>
      <h2>Mix C / CM / D</h2>
      <div className="product-mix">
        {items.map((item) => (
          <div className="product-row" key={item.code}>
            <div>
              <strong>{item.code}</strong>
              <span>{item.name}</span>
            </div>
            <div className="product-bar">
              <span style={{ width: `${item.percentage}%` }} />
            </div>
            <p>{percent(item.percentage)} · {currency(item.totalAmount)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
