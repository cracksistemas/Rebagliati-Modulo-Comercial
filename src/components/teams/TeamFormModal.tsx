"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { executives } from "@/lib/data/mock-data";
import { TeamMemberPicker } from "@/components/teams/TeamMemberPicker";

export function TeamFormModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={17} />
        Crear equipo
      </Button>
      <Modal
        open={open}
        title="Crear equipo comercial"
        description="Asigna lider, meta, color e integrantes para el periodo mensual."
        onClose={() => setOpen(false)}
      >
        <form className="team-form">
          <label>
            Nombre del equipo
            <Input placeholder="Equipo Azul" />
          </label>
          <label>
            Lider del equipo
            <Select>
              {executives.map((executive) => (
                <option value={executive.id} key={executive.id}>{executive.fullName}</option>
              ))}
            </Select>
          </label>
          <label>
            Color del equipo
            <Input type="color" defaultValue="#00a7eb" />
          </label>
          <label>
            Meta mensual
            <Input type="number" min={0} placeholder="42000" />
          </label>
          <label>
            Estado
            <Select defaultValue="Activo">
              <option>Activo</option>
              <option>Inactivo</option>
            </Select>
          </label>
          <div className="span-2">
            <p className="field-label">Ejecutivos</p>
            <TeamMemberPicker />
          </div>
          <div className="form-actions span-2">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button">
              <Save size={17} />
              Guardar equipo
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
