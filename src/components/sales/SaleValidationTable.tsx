"use client";

import { useEffect, useState } from "react";
import { Ban, Check, Eye, Pencil, Save, XCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { executives, productTypes, products, sales, teams } from "@/lib/data/mock-data";
import { currency } from "@/lib/metrics/format";
import { SaleStatusBadge } from "@/components/sales/SaleStatusBadge";
import { broadcastCommercialDataChange, subscribeCommercialDataChange } from "@/lib/commercial/events";
import { loadLinkedCommercialData } from "@/lib/commercial/linked-data";
import { annulCommercialSale, loadCommercialProducts, updateCommercialSale } from "@/lib/supabase/commercial";
import type { Executive, LeadSource, Product, ProductType, Sale, SaleStatus, Team } from "@/types/sales";

export function SaleValidationTable() {
  const [saleList, setSaleList] = useState<Sale[]>(sales);
  const [executiveList, setExecutiveList] = useState<Executive[]>(executives);
  const [teamList, setTeamList] = useState<Team[]>(teams);
  const [productTypeList, setProductTypeList] = useState<ProductType[]>(productTypes);
  const [productList, setProductList] = useState<Product[]>(products);
  const [selected, setSelected] = useState<Sale>(sales[0]);
  const [mode, setMode] = useState<"view" | "edit" | "annul" | null>(null);
  const [, setSyncStatus] = useState("");

  useEffect(() => {
    async function hydrate() {
      const linked = await loadLinkedCommercialData();
      setSaleList(linked.sales);
      setExecutiveList(linked.executives);
      setTeamList(linked.teams);
      setProductTypeList(linked.productTypes);
      setSyncStatus(linked.status);
      setSelected(linked.sales[0] ?? sales[0]);

      try {
        const remoteProducts = await loadCommercialProducts();
        if (remoteProducts.length) setProductList(remoteProducts);
      } catch {
        setProductList(products);
      }
    }

    hydrate();
    return subscribeCommercialDataChange(hydrate);
  }, []);

  const rows = saleList.map((sale) => {
    const executive = executiveList.find((item) => item.id === sale.executiveId);
    const product = productList.find((item) => item.id === sale.productId);

    return [
      <div className="person-cell" key="executive">
        <Avatar src={executive?.photoUrl} name={executive?.fullName ?? "Ejecutivo"} size="sm" />
        <span>{executive?.fullName ?? "Ejecutivo"}</span>
      </div>,
      product?.name ?? "Producto",
      currency(sale.netAmount),
      <SaleStatusBadge status={sale.validationStatus} key="status" />,
      sale.notes ?? "Sin observacion",
      <div className="row-actions" key="actions">
        <Button variant="ghost" aria-label="Ver evidencia" onClick={() => { setSelected(sale); setMode("view"); }}><Eye size={16} /></Button>
        <Button variant="ghost" aria-label="Editar venta" onClick={() => { setSelected(sale); setMode("edit"); }}><Pencil size={16} /></Button>
        <Button variant="secondary" aria-label="Validar venta" onClick={() => { setSelected(sale); setMode("edit"); }}><Check size={16} /></Button>
        <Button variant="danger" aria-label="Anular venta" onClick={() => { setSelected(sale); setMode("annul"); }}><Ban size={16} /></Button>
      </div>
    ];
  });

  function updateLocalSale(updatedSale: Sale) {
    setSaleList((current) => current.map((sale) => (sale.id === updatedSale.id ? updatedSale : sale)));
    setSelected(updatedSale);
    broadcastCommercialDataChange();
  }

  return (
    <>
      <section className="card card-pad">
        <div className="toolbar">
          <div>
            <p className="eyebrow">Validacion de ventas</p>
            <h2>Revision comercial y evidencias</h2>
          </div>
          <div className="action-cluster">
            <span className="pill">Sin borrado fisico</span>
          </div>
        </div>
        <DataTable columns={["Ejecutivo", "Producto", "Monto neto", "Estado", "Observacion", "Acciones"]} rows={rows} />
      </section>
      <SaleEditModal
        sale={selected}
        open={mode === "edit"}
        executives={executiveList}
        teams={teamList}
        productTypes={productTypeList}
        products={productList}
        onSave={updateLocalSale}
        onClose={() => setMode(null)}
      />
      <EvidenceModal sale={selected} products={productList} open={mode === "view"} onClose={() => setMode(null)} />
      <AnnulSaleModal sale={selected} open={mode === "annul"} onAnnul={updateLocalSale} onClose={() => setMode(null)} />
    </>
  );
}

function SaleEditModal({
  sale,
  open,
  executives,
  teams,
  productTypes,
  products,
  onSave,
  onClose
}: {
  sale: Sale;
  open: boolean;
  executives: Executive[];
  teams: Team[];
  productTypes: ProductType[];
  products: Product[];
  onSave: (sale: Sale) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Sale>(sale);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(sale);
      setStatus("");
    }
  }, [sale, open]);

  const executive = executives.find((item) => item.id === draft.executiveId);
  const team = teams.find((item) => item.id === executive?.teamId || item.id === draft.teamId);

  async function persist(nextStatus?: SaleStatus) {
    const updatedSale: Sale = {
      ...draft,
      teamId: team?.id ?? draft.teamId,
      validationStatus: nextStatus ?? draft.validationStatus,
      netAmount: Math.max(draft.grossAmount - draft.discountAmount, 0)
    };

    setStatus("Guardando...");
    try {
      await updateCommercialSale(updatedSale);
      onSave(updatedSale);
      setStatus("Guardado");
      setTimeout(onClose, 500);
    } catch (error) {
      console.warn(error);
      setStatus("No se pudo guardar");
    }
  }

  return (
    <Modal open={open} title="Editar venta / registro" description="Corrige datos, valida u observa la venta. Solo ventas validadas impactan ranking oficial." onClose={onClose}>
      <form className="editor-grid">
        <label>
          Fecha
          <Input type="date" value={draft.saleDate} onChange={(event) => setDraft({ ...draft, saleDate: event.target.value })} />
        </label>
        <label>
          Ejecutivo
          <Select value={draft.executiveId} onChange={(event) => {
            const nextExecutive = executives.find((item) => item.id === event.target.value);
            setDraft({ ...draft, executiveId: event.target.value, teamId: nextExecutive?.teamId ?? draft.teamId });
          }}>
            {executives.map((item) => <option value={item.id} key={item.id}>{item.fullName}</option>)}
          </Select>
        </label>
        <label>
          Equipo
          <Input value={team?.name ?? "Sin equipo"} readOnly />
        </label>
        <label>
          Tipo de producto
          <Select value={draft.productTypeId} onChange={(event) => setDraft({ ...draft, productTypeId: event.target.value })}>
            {productTypes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </Select>
        </label>
        <label>
          Programa / evento
          <Select value={draft.productId} onChange={(event) => setDraft({ ...draft, productId: event.target.value })}>
            <option value="">Sin programa especifico</option>
            {products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </Select>
        </label>
        <label>
          Cantidad
          <Input type="number" min={1} value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Number(event.target.value) })} />
        </label>
        <label>
          Monto bruto
          <Input type="number" min={0} value={draft.grossAmount} onChange={(event) => setDraft({ ...draft, grossAmount: Number(event.target.value) })} />
        </label>
        <label>
          Descuento
          <Input type="number" min={0} value={draft.discountAmount} onChange={(event) => setDraft({ ...draft, discountAmount: Number(event.target.value) })} />
        </label>
        <label>
          Estado de validacion
          <Select value={draft.validationStatus} onChange={(event) => setDraft({ ...draft, validationStatus: event.target.value as SaleStatus })}>
            <option value="registrada">Registrada</option>
            <option value="pendiente_validacion">Pendiente validacion</option>
            <option value="validada">Validada</option>
            <option value="observada">Observada</option>
          </Select>
        </label>
        <label>
          Origen del lead
          <Select value={draft.leadSource} onChange={(event) => setDraft({ ...draft, leadSource: event.target.value as LeadSource })}>
            <option>Meta Ads</option>
            <option>WhatsApp</option>
            <option>Base</option>
            <option>Referido</option>
            <option>Organico</option>
            <option>Otro</option>
          </Select>
        </label>
        <label className="span-2">
          Observacion
          <textarea className="textarea" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>
      </form>
      <div className="editor-actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={() => persist("observada")}><XCircle size={17} /> Observar</Button>
        <Button onClick={() => persist("validada")}><Check size={17} /> Validar / guardar</Button>
      </div>
      <p className="muted">Registro seleccionado: {executive?.fullName ?? "Ejecutivo"} · {currency(Math.max(draft.grossAmount - draft.discountAmount, 0))}</p>
      {status ? <p className="login-status">{status}</p> : null}
    </Modal>
  );
}

function EvidenceModal({ sale, products, open, onClose }: { sale: Sale; products: Product[]; open: boolean; onClose: () => void }) {
  const product = products.find((item) => item.id === sale.productId);

  return (
    <Modal open={open} title="Evidencia de venta" description="Vista previa del voucher o captura adjunta al registro." onClose={onClose}>
      <div className="crop-stage">
        <div className="crop-placeholder">
          {sale.evidencePath ? "Evidencia cargada" : "Sin evidencia adjunta"}
        </div>
      </div>
      <div className="editor-actions">
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        <Button onClick={onClose}><Save size={17} /> Adjuntar evidencia</Button>
      </div>
      <p className="muted">{product?.name ?? "Producto"} · {currency(sale.netAmount)}</p>
    </Modal>
  );
}

function AnnulSaleModal({
  sale,
  open,
  onAnnul,
  onClose
}: {
  sale: Sale;
  open: boolean;
  onAnnul: (sale: Sale) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setStatus("");
    }
  }, [open]);

  async function persistAnnulment() {
    setStatus("Anulando...");
    try {
      await annulCommercialSale(sale.id, reason);
      onAnnul({ ...sale, validationStatus: "anulada", notes: `${sale.notes ?? ""}\nAnulacion: ${reason}`.trim() });
      setStatus("Venta anulada");
      setTimeout(onClose, 500);
    } catch (error) {
      console.warn(error);
      setStatus("No se pudo anular");
    }
  }

  return (
    <Modal open={open} title="Anular venta" description="La venta no se elimina: queda anulada con motivo y auditoria." onClose={onClose}>
      <form className="editor-grid">
        <label>
          Registro
          <Input value={sale.id} readOnly />
        </label>
        <label>
          Monto
          <Input value={currency(sale.netAmount)} readOnly />
        </label>
        <label className="span-2">
          Motivo obligatorio
          <textarea className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ejemplo: pago duplicado, venta no reconocida, evidencia invalida" />
        </label>
      </form>
      <div className="editor-actions">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="danger" onClick={persistAnnulment}><Ban size={17} /> Anular sin borrar</Button>
      </div>
      {status ? <p className="login-status">{status}</p> : null}
    </Modal>
  );
}
