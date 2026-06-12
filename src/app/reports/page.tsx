"use client";

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { getCommercialState, money } from "@/lib/commercial/store";

type ReportFormat = "csv" | "xls" | "pdf";

type ReportDefinition = {
  id: string;
  title: string;
  description: string;
  headers: string[];
  rows: string[][];
};

function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function toCsv(report: ReportDefinition) {
  return [report.headers, ...report.rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function toExcelHtml(report: ReportDefinition) {
  const header = report.headers.map((cell) => `<th>${cell}</th>`).join("");
  const rows = report.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

function exportPdf(report: ReportDefinition) {
  const win = window.open("", "_blank", "width=980,height=760");
  if (!win) return;
  const header = report.headers.map((cell) => `<th>${cell}</th>`).join("");
  const rows = report.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
  win.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${report.title}</title>
  <style>
    body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:32px;color:#1D1D1F}
    h1{font-size:28px;margin:0 0 8px}
    p{color:#74747A;margin:0 0 22px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #E5E5EA;text-align:left;padding:10px;font-size:13px}
    th{background:#F5F5F7;text-transform:uppercase;font-size:11px}
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p>${report.description}</p>
  <table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>
</body>
</html>`);
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 250);
}

function buildReports(): ReportDefinition[] {
  const state = getCommercialState();
  const teamsById = new Map(state.teams.map((team) => [team.id, team]));
  const executivesById = new Map(state.executives.map((executive) => [executive.id, executive]));
  const sales = state.sales;

  const executiveRanking = [...state.executives]
    .sort((a, b) => b.points - a.points || b.currentSales - a.currentSales)
    .map((executive, index) => [
      String(index + 1),
      executive.fullName,
      executive.code,
      teamsById.get(executive.teamId ?? "")?.name ?? "Sin equipo",
      String(executive.points),
      money(executive.currentSales)
    ]);

  const teamRanking = state.teams.map((team) => {
    const members = state.executives.filter((executive) => executive.teamId === team.id);
    const amount = members.reduce((sum, executive) => sum + executive.currentSales, 0);
    return [team.name, executivesById.get(team.leaderId ?? "")?.fullName ?? "Sin lider", String(members.length), money(amount), money(team.goalAmount)];
  });

  const byProduct = ["Curso", "Curso Modular", "Diplomado"].map((type) => {
    const filtered = sales.filter((sale) => sale.productType === type);
    return [type, String(filtered.reduce((sum, sale) => sum + sale.quantity, 0)), money(filtered.reduce((sum, sale) => sum + sale.netAmount, 0))];
  });

  const leadSources = Array.from(new Set(sales.map((sale) => sale.leadSource))).map((source) => {
    const filtered = sales.filter((sale) => sale.leadSource === source);
    return [source, String(filtered.length), money(filtered.reduce((sum, sale) => sum + sale.netAmount, 0))];
  });

  const observed = sales
    .filter((sale) => sale.validationStatus === "observada")
    .map((sale) => [sale.saleDate, executivesById.get(sale.executiveId)?.fullName ?? "Sin ejecutivo", sale.productName, money(sale.netAmount), sale.notes ?? ""]);

  const history = state.audit.map((event) => [event.createdAt, event.actor, event.action, event.module, event.target, event.result]);

  return [
    { id: "ranking-ejecutivo", title: "Ranking mensual por ejecutivo", description: "Posicion, equipo, puntos y monto mensual.", headers: ["#", "Ejecutivo", "Codigo", "Equipo", "Puntos", "Monto"], rows: executiveRanking },
    { id: "ranking-equipo", title: "Ranking mensual por equipo", description: "Acumulado, lider y meta mensual por equipo.", headers: ["Equipo", "Lider", "Integrantes", "Acumulado", "Meta"], rows: teamRanking },
    { id: "producto", title: "Ventas por tipo de producto", description: "Mix comercial por Curso, Curso Modular y Diplomado.", headers: ["Tipo", "Cantidad", "Monto neto"], rows: byProduct },
    { id: "origen", title: "Ventas por origen de lead", description: "Rendimiento por fuente comercial.", headers: ["Origen", "Ventas", "Monto neto"], rows: leadSources },
    { id: "observadas", title: "Ventas observadas", description: "Ventas que requieren revision o correccion.", headers: ["Fecha", "Ejecutivo", "Producto", "Monto", "Observacion"], rows: observed },
    { id: "historico", title: "Historico de ranking", description: "Auditoria y cambios principales del modulo.", headers: ["Fecha", "Usuario", "Accion", "Modulo", "Registro", "Resultado"], rows: history }
  ];
}

export default function ReportsPage() {
  const reports = buildReports();

  function exportReport(report: ReportDefinition, format: ReportFormat) {
    const slug = report.id;
    if (format === "csv") {
      downloadFile(`${slug}.csv`, toCsv(report), "text/csv;charset=utf-8");
    }
    if (format === "xls") {
      downloadFile(`${slug}.xls`, toExcelHtml(report), "application/vnd.ms-excel;charset=utf-8");
    }
    if (format === "pdf") {
      exportPdf(report);
    }
  }

  return (
    <section className="card">
      <p className="eyebrow">Reportes</p>
      <h2>Reportes exportables</h2>
      <div className="grid grid-3">
        {reports.map((report) => (
          <div className="card" style={{ boxShadow: "none" }} key={report.id}>
            <strong>{report.title}</strong>
            <p className="muted">{report.description}</p>
            <p className="badge"><Download size={15} /> {report.rows.length} registros</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button className="ghost-button" onClick={() => exportReport(report, "csv")}><FileText size={16} /> CSV</button>
              <button className="ghost-button" onClick={() => exportReport(report, "xls")}><FileSpreadsheet size={16} /> Excel</button>
              <button className="primary-button" onClick={() => exportReport(report, "pdf")}><Printer size={16} /> PDF</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
