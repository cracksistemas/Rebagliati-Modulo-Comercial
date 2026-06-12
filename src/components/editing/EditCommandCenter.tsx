import Link from "next/link";
import { Camera, ReceiptText, Target, UsersRound } from "lucide-react";

const commands = [
  { href: "/executives", label: "Fotos y perfiles", helper: "Subir, recortar y editar ejecutivos", icon: Camera },
  { href: "/goals", label: "Metas comerciales", helper: "Monto, puntos, alcance y mes", icon: Target },
  { href: "/sales/validation", label: "Ventas y registros", helper: "Validar, observar, anular o corregir", icon: ReceiptText },
  { href: "/teams", label: "Equipos", helper: "Lideres, integrantes, color y meta", icon: UsersRound }
];

export function EditCommandCenter() {
  return (
    <section className="section-grid grid-4">
      {commands.map((command) => {
        const Icon = command.icon;
        return (
          <Link className="edit-command-card" href={command.href} key={command.href}>
            <span className="edit-command-icon">
              <Icon size={22} />
            </span>
            <span>
              <strong>{command.label}</strong>
              <span>{command.helper}</span>
            </span>
          </Link>
        );
      })}
    </section>
  );
}
