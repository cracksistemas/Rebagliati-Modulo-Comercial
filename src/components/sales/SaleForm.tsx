"use client";

import { useEffect, useMemo, useState } from "react";
import { Paperclip, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { broadcastCommercialDataChange } from "@/lib/commercial/events";
import { executives, products, productTypes, teams } from "@/lib/data/mock-data";
import {
  getCurrentUserId,
  loadCommercialExecutives,
  loadCommercialProductTypes,
  loadCommercialProducts,
  loadCommercialTeams,
  saveCommercialSale
} from "@/lib/supabase/commercial";
import type { Executive, LeadSource, Product, ProductType, Sale, Team } from "@/types/sales";

export function SaleForm() {
  const [executiveList, setExecutiveList] = useState<Executive[]>(executives);
  const [teamList, setTeamList] = useState<Team[]>(teams);
  const [productTypeList, setProductTypeList] = useState<ProductType[]>(productTypes);
  const [productList, setProductList] = useState<Product[]>(products);
  const [executiveId, setExecutiveId] = useState(executives[0]?.id ?? "");
  const [productTypeId, setProductTypeId] = useState(productTypes[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [saleDate, setSaleDate] = useState("2026-06-10");
  const [quantity, setQuantity] = useState(1);
  const [gross, setGross] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [leadSource, setLeadSource] = useState<LeadSource>("Meta Ads");
  const [notes, setNotes] = useState("");
  const [syncStatus, setSyncStatus] = useState("");

  const selectedExecutive = executiveList.find((executive) => executive.id === executiveId);
  const selectedTeam = teamList.find((team) => team.id === selectedExecutive?.teamId);
  const filteredProducts = productList.filter((product) => product.productTypeId === productTypeId);
  const netAmount = useMemo(() => Math.max(gross - discount, 0), [gross, discount]);

  useEffect(() => {
    hydrateSaleForm();
  }, []);

  useEffect(() => {
    const firstProduct = productList.find((product) => product.productTypeId === productTypeId);
    setProductId(firstProduct?.id ?? "");
  }, [productTypeId, productList]);

  async function hydrateSaleForm() {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const [remoteExecutives, remoteTeams, remoteTypes, remoteProducts] = await Promise.all([
          loadCommercialExecutives(),
          loadCommercialTeams(),
          loadCommercialProductTypes(),
          loadCommercialProducts()
        ]);

        setExecutiveList(remoteExecutives);
        setTeamList(remoteTeams);
        setProductTypeList(remoteTypes);
        setProductList(remoteProducts);
        setExecutiveId(remoteExecutives[0]?.id ?? "");
        setProductTypeId(remoteTypes[0]?.id ?? "");
        setProductId(remoteProducts[0]?.id ?? "");
        setSyncStatus("");
        return;
      }
    } catch (error) {
      console.warn(error);
      setSyncStatus("");
      return;
    }

    setSyncStatus("");
  }

  async function handleSubmit() {
    if (!selectedExecutive?.teamId || !selectedTeam?.id || !productTypeId) {
      setSyncStatus("Falta ejecutivo, equipo o tipo de producto.");
      return;
    }

    const sale: Sale = {
      id: crypto.randomUUID(),
      saleDate,
      executiveId,
      teamId: selectedTeam.id,
      productTypeId,
      productId,
      quantity,
      grossAmount: gross,
      discountAmount: discount,
      netAmount,
      paymentMethod,
      leadSource,
      validationStatus: "pendiente_validacion",
      notes
    };

    try {
      await saveCommercialSale(sale);
      broadcastCommercialDataChange();
      setSyncStatus("Venta registrada");
      setQuantity(1);
      setGross(0);
      setDiscount(0);
      setNotes("");
    } catch (error) {
      const stored = window.localStorage.getItem("reba-sales");
      const localSales = stored ? (JSON.parse(stored) as Sale[]) : [];
      window.localStorage.setItem("reba-sales", JSON.stringify([sale, ...localSales]));
      broadcastCommercialDataChange();
      console.warn(error);
      setSyncStatus("Venta registrada");
      setQuantity(1);
      setGross(0);
      setDiscount(0);
      setNotes("");
    }
  }

  return (
    <form className="sale-form" onSubmit={(event) => { event.preventDefault(); handleSubmit(); }}>
      {syncStatus ? <div className="span-2"><span className="pill">{syncStatus}</span></div> : null}
      <label>
        Fecha de venta
        <Input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} required />
      </label>
      <label>
        Ejecutivo
        <Select value={executiveId} onChange={(event) => setExecutiveId(event.target.value)} required>
          {executiveList.map((executive) => (
            <option value={executive.id} key={executive.id}>{executive.fullName}</option>
          ))}
        </Select>
      </label>
      <label>
        Equipo
        <Input value={selectedTeam?.name ?? "Sin equipo"} readOnly />
      </label>
      <label>
        Tipo de producto
        <Select value={productTypeId} onChange={(event) => setProductTypeId(event.target.value)} required>
          {productTypeList.map((type) => (
            <option value={type.id} key={type.id}>{type.name}</option>
          ))}
        </Select>
      </label>
      <label className="span-2">
        Programa / evento
        <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">Sin programa especifico</option>
          {filteredProducts.map((product) => (
            <option value={product.id} key={product.id}>{product.name}</option>
          ))}
        </Select>
      </label>
      <label>
        Cantidad
        <Input type="number" min={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
      </label>
      <label>
        Monto bruto
        <Input type="number" min={0} value={gross} onChange={(event) => setGross(Number(event.target.value))} required />
      </label>
      <label>
        Descuento aplicado
        <Input type="number" min={0} value={discount} onChange={(event) => setDiscount(Number(event.target.value))} required />
      </label>
      <label>
        Monto neto
        <Input value={netAmount.toFixed(2)} readOnly />
      </label>
      <label>
        Medio de pago
        <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          <option>Transferencia</option>
          <option>Tarjeta</option>
          <option>Yape</option>
          <option>Plin</option>
          <option>Efectivo</option>
        </Select>
      </label>
      <label>
        Origen del lead
        <Select value={leadSource} onChange={(event) => setLeadSource(event.target.value as LeadSource)}>
          <option>Meta Ads</option>
          <option>WhatsApp</option>
          <option>Base</option>
          <option>Referido</option>
          <option>Organico</option>
          <option>Otro</option>
        </Select>
      </label>
      <label className="span-2">
        Evidencia opcional
        <span className="upload-zone">
          <Paperclip size={18} />
          Adjuntar voucher o captura
        </span>
      </label>
      <label className="span-2">
        Observacion
        <textarea className="textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Detalle corto para validacion" />
      </label>
      <div className="form-actions span-2">
        <Button variant="secondary" type="button">Guardar borrador</Button>
        <Button type="submit">
          <Save size={17} />
          Registrar pendiente
        </Button>
      </div>
    </form>
  );
}
