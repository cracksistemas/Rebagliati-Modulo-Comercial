import { Download } from "lucide-react";

export default function ReportsPage() {
  return (
    <section className="card">
      <p className="eyebrow">Reportes</p>
      <h2>Reportes exportables</h2>
      <div className="grid grid-3">
        {["Ranking mensual por ejecutivo", "Ranking mensual por equipo", "Ventas por tipo de producto", "Ventas por origen de lead", "Ventas observadas", "Historico de ranking"].map((item) => (
          <div className="card" style={{ boxShadow: "none" }} key={item}>
            <strong>{item}</strong>
            <p className="muted">CSV · Excel · PDF gerencial</p>
            <button className="ghost-button"><Download size={16} /> Exportar</button>
          </div>
        ))}
      </div>
    </section>
  );
}
