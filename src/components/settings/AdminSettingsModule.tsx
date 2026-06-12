"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Ban,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileClock,
  LockKeyhole,
  Plus,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  getBaseRoles,
  getRolePermissions,
  loadAdminRoles,
  loadAdminSessions,
  loadAdminUsers,
  loadAuditEvents,
  logAdminAction,
  permissionMatrix,
  saveAdminRole,
  saveAdminUser,
  updateAdminUserStatus,
  type AdminPermission,
  type AdminRole,
  type AdminSection,
  type AdminSession,
  type AdminUser,
  type AdminUserStatus,
  type AuditEvent
} from "@/lib/supabase/admin-settings";

const tabs: Array<{ id: AdminSection; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Resumen", icon: ShieldCheck },
  { id: "users", label: "Usuarios", icon: UsersRound },
  { id: "roles", label: "Roles y permisos", icon: UserCog },
  { id: "audit", label: "Auditoria", icon: FileClock },
  { id: "security", label: "Seguridad / Sesiones", icon: LockKeyhole }
];

const areas = ["Comercial", "Ventas", "Marketing", "Coordinacion academica", "Cobranzas", "Recepcion", "Diseno", "Administracion"];
const statuses: AdminUserStatus[] = ["Activo", "Inactivo", "Pendiente de invitacion", "Bloqueado", "Archivado"];

export function AdminSettingsModule() {
  const [activeTab, setActiveTab] = useState<AdminSection>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrateSettings();
  }, []);

  async function hydrateSettings() {
    setLoading(true);
    try {
      const loadedUsers = await loadAdminUsers();
      const [loadedRoles, loadedAudit, loadedSessions] = await Promise.all([
        loadAdminRoles(loadedUsers),
        loadAuditEvents(),
        loadAdminSessions()
      ]);
      setUsers(loadedUsers);
      setRoles(loadedRoles.length ? loadedRoles : getBaseRoles(loadedUsers));
      setAuditEvents(loadedAudit);
      setSessions(loadedSessions);
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  }

  const activeUsers = users.filter((user) => user.status === "Activo").length;
  const inactiveUsers = users.filter((user) => user.status !== "Activo").length;
  const lastEvent = auditEvents[0];
  const securityAlerts = users.filter((user) => user.status === "Bloqueado").length + auditEvents.filter((event) => event.criticality === "Critica").length;

  return (
    <section className="settings-module">
      <div className="settings-hero card card-pad">
        <div>
          <p className="eyebrow">Configuracion</p>
          <h2>Centro administrativo</h2>
          <p>Controla usuarios, roles, permisos, auditoria y sesiones desde un solo espacio operativo.</p>
        </div>
        <div className="settings-tabbar" role="tablist" aria-label="Secciones de configuracion">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={activeTab === tab.id ? "is-active" : ""} key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}>
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <div className="card card-pad">Cargando configuracion...</div> : null}

      {activeTab === "overview" ? (
        <OverviewPanel
          activeUsers={activeUsers}
          inactiveUsers={inactiveUsers}
          rolesCount={roles.length}
          lastEvent={lastEvent}
          securityAlerts={securityAlerts}
          onNavigate={setActiveTab}
        />
      ) : null}
      {activeTab === "users" ? <UsersPanel users={users} roles={roles} onRefresh={hydrateSettings} /> : null}
      {activeTab === "roles" ? <RolesPanel roles={roles} users={users} onRefresh={hydrateSettings} /> : null}
      {activeTab === "audit" ? <AuditPanel events={auditEvents} /> : null}
      {activeTab === "security" ? <SecurityPanel sessions={sessions} users={users} onRefresh={hydrateSettings} /> : null}
    </section>
  );
}

function OverviewPanel({
  activeUsers,
  inactiveUsers,
  rolesCount,
  lastEvent,
  securityAlerts,
  onNavigate
}: {
  activeUsers: number;
  inactiveUsers: number;
  rolesCount: number;
  lastEvent?: AuditEvent;
  securityAlerts: number;
  onNavigate: (section: AdminSection) => void;
}) {
  const cards = [
    { label: "Usuarios activos", value: activeUsers, icon: UsersRound },
    { label: "Usuarios inactivos", value: inactiveUsers, icon: Ban },
    { label: "Roles creados", value: rolesCount, icon: UserCog },
    { label: "Alertas de seguridad", value: securityAlerts, icon: ShieldAlert }
  ];

  return (
    <div className="section-grid">
      <div className="settings-kpi-grid">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <article className="settings-kpi card card-pad" key={item.label}>
              <Icon size={22} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          );
        })}
      </div>
      <div className="section-grid grid-2">
        <article className="card card-pad">
          <p className="eyebrow">Ultima actividad registrada</p>
          <h3>{lastEvent?.action ?? "Sin actividad reciente"}</h3>
          <p className="muted">{lastEvent ? `${lastEvent.module} · ${formatDateTime(lastEvent.createdAt)}` : "La auditoria aparecera cuando existan acciones sensibles."}</p>
        </article>
        <article className="card card-pad">
          <p className="eyebrow">Accesos rapidos</p>
          <div className="settings-shortcuts">
            <Button onClick={() => onNavigate("users")}><UsersRound size={17} /> Administrar usuarios</Button>
            <Button variant="secondary" onClick={() => onNavigate("roles")}><UserCog size={17} /> Roles y permisos</Button>
            <Button variant="secondary" onClick={() => onNavigate("audit")}><FileClock size={17} /> Revisar auditoria</Button>
          </div>
        </article>
      </div>
    </div>
  );
}

function UsersPanel({ users, roles, onRefresh }: { users: AdminUser[]; roles: AdminRole[]; onRefresh: () => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [areaFilter, setAreaFilter] = useState("Todos");
  const [modal, setModal] = useState<"create" | "edit" | "status" | "activity" | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const filteredUsers = users.filter((user) => {
    const text = `${user.fullName} ${user.email} ${user.area} ${user.role}`.toLowerCase();
    return (
      text.includes(query.toLowerCase()) &&
      (statusFilter === "Todos" || user.status === statusFilter) &&
      (roleFilter === "Todos" || user.role === roleFilter) &&
      (areaFilter === "Todos" || user.area === areaFilter)
    );
  });

  const rows = filteredUsers.map((user) => [
    <button className="settings-user-button" type="button" onClick={() => { setSelected(user); setModal("activity"); }} key={`${user.id}-name`}>
      <strong>{user.fullName}</strong>
      <span>{user.email}</span>
    </button>,
    roleLabel(user.role, roles),
    user.area,
    <StatusPill status={user.status} key={`${user.id}-status`} />,
    user.lastAccessAt ? formatDateTime(user.lastAccessAt) : "Sin acceso",
    formatDate(user.createdAt),
    <div className="action-cluster" key={`${user.id}-actions`}>
      <Button className="icon-command" variant="ghost" aria-label="Editar" onClick={() => { setSelected(user); setModal("edit"); }}>
        <UserCog size={16} />
      </Button>
      <Button className="icon-command" variant="secondary" aria-label="Desactivar" onClick={() => { setSelected(user); setModal("status"); }}>
        <Ban size={16} />
      </Button>
      <Button className="icon-command" variant="danger" aria-label="Bloquear" onClick={() => { setSelected({ ...user, status: "Bloqueado" }); setModal("status"); }}>
        <LockKeyhole size={16} />
      </Button>
    </div>
  ]);

  return (
    <article className="card card-pad">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Usuarios</p>
          <h2 style={{ margin: 0 }}>Accesos del sistema</h2>
        </div>
        <Button onClick={() => { setSelected(null); setModal("create"); }}><Plus size={17} /> Crear usuario</Button>
      </div>
      <SettingsFilters
        query={query}
        setQuery={setQuery}
        filters={[
          { value: statusFilter, onChange: setStatusFilter, options: ["Todos", ...statuses], label: "Estado" },
          { value: roleFilter, onChange: setRoleFilter, options: ["Todos", ...roles.map((role) => role.code)], label: "Rol", render: (value) => value === "Todos" ? value : roleLabel(value, roles) },
          { value: areaFilter, onChange: setAreaFilter, options: ["Todos", ...areas], label: "Area" }
        ]}
      />
      {rows.length ? (
        <DataTable columns={["Usuario", "Rol", "Area", "Estado", "Ultimo acceso", "Creacion", "Acciones"]} rows={rows} />
      ) : (
        <EmptyState title="Aun no hay usuarios registrados" description="Crea tu primer usuario para empezar a asignar accesos." action={<Button onClick={() => setModal("create")}><Plus size={17} /> Crear usuario</Button>} />
      )}
      <UserEditorModal open={modal === "create" || modal === "edit"} user={selected} roles={roles} onClose={() => setModal(null)} onSaved={onRefresh} />
      <UserStatusModal open={modal === "status"} user={selected} onClose={() => setModal(null)} onSaved={onRefresh} />
      <UserDetailModal open={modal === "activity"} user={selected} roles={roles} onClose={() => setModal(null)} />
    </article>
  );
}

function UserEditorModal({ open, user, roles, onClose, onSaved }: { open: boolean; user: AdminUser | null; roles: AdminRole[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<AdminUser>(blankUser(roles[0]?.code ?? "ejecutivo"));
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setStatus("");
    setDraft(user ?? blankUser(roles[0]?.code ?? "ejecutivo"));
  }, [open, user, roles]);

  if (!open) return null;

  const selectedRole = roles.find((role) => role.code === draft.role);
  const permissions = getRolePermissions(draft.role).filter((permission) => permission.allowed).slice(0, 5);
  const isEditing = Boolean(user);

  async function handleSave() {
    setStatus("Guardando usuario...");
    try {
      await saveAdminUser(draft);
      setStatus(isEditing ? "Usuario actualizado correctamente." : "Usuario creado correctamente.");
      await onSaved();
      setTimeout(onClose, 500);
    } catch (error) {
      console.warn(error);
      setStatus("No se pudo guardar el usuario. Verifica correo, rol y permisos.");
    }
  }

  return (
    <Modal open={open} title={isEditing ? "Editar usuario" : "Crear usuario"} description="Flujo guiado para definir datos, area, rol y permisos heredados." onClose={onClose}>
      <div className="settings-stepper">
        {[1, 2, 3, 4].map((item) => <span className={step >= item ? "is-active" : ""} key={item}>{item}</span>)}
      </div>
      {step === 1 ? (
        <form className="editor-grid">
          <label>Nombre<Input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value, fullName: `${event.target.value} ${draft.lastName}`.trim() })} /></label>
          <label>Apellido<Input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value, fullName: `${draft.firstName} ${event.target.value}`.trim() })} /></label>
          <label>Correo<Input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label>
          <label>Telefono<Input value={draft.phone ?? ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
          <label>Cargo<Input value={draft.jobTitle ?? ""} onChange={(event) => setDraft({ ...draft, jobTitle: event.target.value })} /></label>
          <label>Sede<Input value={draft.location ?? ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
        </form>
      ) : null}
      {step === 2 ? (
        <form className="editor-grid">
          <label>Area<Select value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })}>{areas.map((area) => <option key={area}>{area}</option>)}</Select></label>
          <label>Estado inicial<Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AdminUserStatus })}>{statuses.slice(0, 3).map((item) => <option key={item}>{item}</option>)}</Select></label>
          <label className="span-2">Notas internas<textarea className="textarea" value={draft.internalNotes ?? ""} onChange={(event) => setDraft({ ...draft, internalNotes: event.target.value })} /></label>
        </form>
      ) : null}
      {step === 3 ? (
        <div className="section-grid">
          <label className="field-stack">Rol<Select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })}>{roles.map((role) => <option value={role.code} key={role.code}>{role.name}</option>)}</Select></label>
          <div className="settings-permission-preview">
            <strong>{selectedRole?.name}</strong>
            <p>{selectedRole?.description}</p>
            {permissions.map((permission) => <span key={`${permission.module}-${permission.action}`}>{permission.module}: {permission.action} · {permission.scope}</span>)}
          </div>
        </div>
      ) : null}
      {step === 4 ? (
        <div className="settings-confirm">
          <p className="eyebrow">Confirmacion</p>
          <h3>Estas por {isEditing ? "actualizar" : "crear"} este usuario</h3>
          <dl>
            <dt>Nombre</dt><dd>{draft.fullName}</dd>
            <dt>Correo</dt><dd>{draft.email}</dd>
            <dt>Area</dt><dd>{draft.area}</dd>
            <dt>Rol</dt><dd>{selectedRole?.name}</dd>
            <dt>Estado</dt><dd>{draft.status}</dd>
          </dl>
          <p className="muted">Esta accion quedara registrada en auditoria.</p>
        </div>
      ) : null}
      <div className="editor-actions">
        <Button variant="secondary" onClick={step === 1 ? onClose : () => setStep(step - 1)}>{step === 1 ? "Cancelar" : "Atras"}</Button>
        {step < 4 ? <Button onClick={() => setStep(step + 1)}>Continuar</Button> : <Button onClick={handleSave}><Save size={17} /> {isEditing ? "Guardar cambios" : "Crear usuario"}</Button>}
      </div>
      {status ? <p className="login-status">{status}</p> : null}
    </Modal>
  );
}

function UserStatusModal({ open, user, onClose, onSaved }: { open: boolean; user: AdminUser | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<AdminUserStatus>("Inactivo");
  const [reason, setReason] = useState("Ya no pertenece al equipo");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setStatus(user.status === "Bloqueado" ? "Bloqueado" : "Inactivo");
    setReason(user.status === "Bloqueado" ? "Actividad sospechosa" : "Ya no pertenece al equipo");
    setMessage("");
  }, [open, user]);

  if (!open || !user) return null;

  async function handleConfirm() {
    try {
      await updateAdminUserStatus(user!, status, reason);
      setMessage("Estado actualizado correctamente.");
      await onSaved();
      setTimeout(onClose, 500);
    } catch (error) {
      console.warn(error);
      setMessage("No se pudo actualizar el estado.");
    }
  }

  return (
    <Modal open={open} title={status === "Bloqueado" ? "Bloquear usuario" : "Desactivar usuario"} description="El historial se conservara y la accion quedara registrada." onClose={onClose}>
      <div className="settings-confirm">
        <strong>{user.fullName}</strong>
        <p className="muted">El usuario no podra acceder mientras mantenga este estado.</p>
      </div>
      <form className="editor-grid">
        <label>Estado<Select value={status} onChange={(event) => setStatus(event.target.value as AdminUserStatus)}><option>Inactivo</option><option>Bloqueado</option><option>Activo</option></Select></label>
        <label>Motivo<Select value={reason} onChange={(event) => setReason(event.target.value)}><option>Ya no pertenece al equipo</option><option>Cambio temporal de funciones</option><option>Error de creacion</option><option>Suspension interna</option><option>Actividad sospechosa</option><option>Otro</option></Select></label>
      </form>
      <div className="editor-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant={status === "Bloqueado" ? "danger" : "primary"} onClick={handleConfirm}>Confirmar</Button></div>
      {message ? <p className="login-status">{message}</p> : null}
    </Modal>
  );
}

function UserDetailModal({ open, user, roles, onClose }: { open: boolean; user: AdminUser | null; roles: AdminRole[]; onClose: () => void }) {
  if (!open || !user) return null;
  return (
    <Modal open={open} title="Perfil administrativo" description="Datos generales, permisos heredados y actividad reciente." onClose={onClose}>
      <div className="settings-profile-tabs">
        <article><p className="eyebrow">Datos generales</p><strong>{user.fullName}</strong><span>{user.email}</span><span>{user.area} · {user.jobTitle || "Sin cargo"}</span></article>
        <article><p className="eyebrow">Rol y permisos</p><strong>{roleLabel(user.role, roles)}</strong>{getRolePermissions(user.role).filter((item) => item.allowed).slice(0, 4).map((item) => <span key={`${item.module}-${item.action}`}>{item.action}</span>)}</article>
        <article><p className="eyebrow">Sesiones</p><strong>{user.lastAccessAt ? "Acceso reciente" : "Sin accesos registrados"}</strong><span>{user.lastAccessAt ? formatDateTime(user.lastAccessAt) : "Pendiente"}</span></article>
      </div>
    </Modal>
  );
}

function RolesPanel({ roles, users, onRefresh }: { roles: AdminRole[]; users: AdminUser[]; onRefresh: () => Promise<void> }) {
  const [selected, setSelected] = useState<AdminRole | null>(roles[0] ?? null);
  const [modal, setModal] = useState<"edit" | "duplicate" | null>(null);

  useEffect(() => {
    if (!selected && roles[0]) setSelected(roles[0]);
  }, [roles, selected]);

  const rows = roles.map((role) => [
    <strong key={`${role.code}-name`}>{role.name}</strong>,
    role.description,
    role.usersCount,
    role.accessLevel,
    role.status,
    role.updatedAt ? formatDate(role.updatedAt) : "Sistema",
    <div className="action-cluster" key={`${role.code}-actions`}>
      <Button className="icon-command" variant="ghost" aria-label="Editar rol" onClick={() => { setSelected(role); setModal("edit"); }}><SlidersHorizontal size={16} /></Button>
      <Button className="icon-command" variant="secondary" aria-label="Duplicar rol" onClick={() => { setSelected(role); setModal("duplicate"); }}><Copy size={16} /></Button>
    </div>
  ]);

  return (
    <article className="card card-pad">
      <div className="toolbar"><div><p className="eyebrow">Roles y permisos</p><h2 style={{ margin: 0 }}>Matriz administrativa</h2></div><Button onClick={() => { setSelected(null); setModal("edit"); }}><Plus size={17} /> Crear rol</Button></div>
      {rows.length ? <DataTable columns={["Rol", "Descripcion", "Usuarios", "Nivel", "Estado", "Modificacion", "Acciones"]} rows={rows} /> : <EmptyState title="Aun no hay roles personalizados" description="Puedes crear un rol nuevo o usar los roles base del sistema." action={<Button onClick={() => setModal("edit")}><Plus size={17} /> Crear rol</Button>} />}
      <RoleEditorModal open={Boolean(modal)} mode={modal} role={selected} users={users} onClose={() => setModal(null)} onSaved={onRefresh} />
    </article>
  );
}

function RoleEditorModal({ open, mode, role, users, onClose, onSaved }: { open: boolean; mode: "edit" | "duplicate" | null; role: AdminRole | null; users: AdminUser[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [draft, setDraft] = useState<AdminRole>(blankRole());
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const nextRole = mode === "duplicate" && role ? { ...role, id: crypto.randomUUID(), code: `${role.code}_copia_${Date.now()}`, name: `Copia de ${role.name}`, systemRole: false, status: "Personalizado" as const, usersCount: 0 } : role ?? blankRole();
    setDraft(nextRole);
    setPermissions(getRolePermissions(nextRole.code));
    setMessage("");
  }, [open, mode, role]);

  if (!open) return null;
  const affectedUsers = users.filter((user) => user.role === role?.code).length;

  function togglePermission(permission: AdminPermission) {
    setPermissions((current) => current.map((item) => item.module === permission.module && item.action === permission.action ? { ...item, allowed: !item.allowed, scope: item.allowed ? "No permitir" : "Todos" } : item));
  }

  async function handleSave() {
    try {
      await saveAdminRole(draft, permissions);
      setMessage("Rol actualizado correctamente.");
      await onSaved();
      setTimeout(onClose, 500);
    } catch (error) {
      console.warn(error);
      setMessage("No se pudo guardar el rol.");
    }
  }

  return (
    <Modal open={open} title={mode === "duplicate" ? "Duplicar rol" : role ? "Editar rol" : "Crear rol"} description={`${affectedUsers} usuarios se veran afectados si modificas este rol.`} onClose={onClose}>
      <form className="editor-grid">
        <label>Nombre del rol<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        <label>Nivel de acceso<Input type="number" value={draft.accessLevel} onChange={(event) => setDraft({ ...draft, accessLevel: Number(event.target.value) })} /></label>
        <label className="span-2">Descripcion<textarea className="textarea" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      </form>
      <div className="permission-matrix">
        {permissionMatrix.map((group) => (
          <section key={group.module}>
            <h3>{group.module}</h3>
            {permissions.filter((item) => item.module === group.module).map((permission) => (
              <label key={`${permission.module}-${permission.action}`}>
                <input type="checkbox" checked={permission.allowed} onChange={() => togglePermission(permission)} />
                <span>{permission.action}</span>
                <Select value={permission.scope} onChange={(event) => setPermissions((current) => current.map((item) => item.module === permission.module && item.action === permission.action ? { ...item, scope: event.target.value, allowed: event.target.value !== "No permitir" } : item))}>
                  {group.scopes.map((scope) => <option key={scope}>{scope}</option>)}
                </Select>
              </label>
            ))}
          </section>
        ))}
      </div>
      <div className="editor-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}><Save size={17} /> Guardar rol</Button></div>
      {message ? <p className="login-status">{message}</p> : null}
    </Modal>
  );
}

function AuditPanel({ events }: { events: AuditEvent[] }) {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("Todos");
  const [criticalityFilter, setCriticalityFilter] = useState("Todos");
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const filteredEvents = events.filter((event) => {
    const text = `${event.userName} ${event.action} ${event.module} ${event.recordId ?? ""} ${event.ipAddress ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (moduleFilter === "Todos" || event.module === moduleFilter) && (criticalityFilter === "Todos" || event.criticality === criticalityFilter);
  });

  const modules = ["Todos", ...Array.from(new Set(events.map((event) => event.module)))];
  const rows = filteredEvents.map((event) => [
    formatDateTime(event.createdAt),
    event.userName,
    event.action,
    event.module,
    event.recordId ?? "Sin registro",
    event.result,
    event.criticality,
    <Button className="icon-command" variant="ghost" key={`${event.id}-detail`} onClick={() => setSelected(event)} aria-label="Ver detalle"><Eye size={16} /></Button>
  ]);

  return (
    <article className="card card-pad">
      <div className="toolbar"><div><p className="eyebrow">Auditoria</p><h2 style={{ margin: 0 }}>Eventos del sistema</h2></div><Button variant="secondary" onClick={() => logAdminAction("Auditoria", "Exporto auditoria", undefined, null, { count: filteredEvents.length }, "Alta")}><Download size={17} /> Exportar</Button></div>
      <SettingsFilters query={query} setQuery={setQuery} filters={[{ value: moduleFilter, onChange: setModuleFilter, options: modules, label: "Modulo" }, { value: criticalityFilter, onChange: setCriticalityFilter, options: ["Todos", "Baja", "Media", "Alta", "Critica"], label: "Criticidad" }]} />
      {rows.length ? <DataTable columns={["Fecha", "Usuario", "Accion", "Modulo", "Registro", "Resultado", "Criticidad", "Detalle"]} rows={rows} /> : <EmptyState title="No se encontraron eventos" description="Prueba cambiando el rango de fechas o quitando filtros." />}
      <AuditDetailModal event={selected} onClose={() => setSelected(null)} />
    </article>
  );
}

function AuditDetailModal({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  if (!event) return null;
  return (
    <Modal open title="Detalle de auditoria" description="Comparacion de datos anteriores y nuevos." onClose={onClose}>
      <div className="audit-detail-grid">
        <span><strong>Evento</strong>{event.action}</span>
        <span><strong>Fecha</strong>{formatDateTime(event.createdAt)}</span>
        <span><strong>Usuario</strong>{event.userName}</span>
        <span><strong>Modulo</strong>{event.module}</span>
        <span><strong>Resultado</strong>{event.result}</span>
        <span><strong>Criticidad</strong>{event.criticality}</span>
      </div>
      <div className="audit-json-grid">
        <pre>{JSON.stringify(event.oldData ?? {}, null, 2)}</pre>
        <pre>{JSON.stringify(event.newData ?? {}, null, 2)}</pre>
      </div>
    </Modal>
  );
}

function SecurityPanel({ sessions, users, onRefresh }: { sessions: AdminSession[]; users: AdminUser[]; onRefresh: () => Promise<void> }) {
  const blockedUsers = users.filter((user) => user.status === "Bloqueado");
  const rows = sessions.map((session) => [session.userEmail, session.device, session.browser, session.ipAddress || "Sin IP", session.location || "Sin ubicacion", formatDateTime(session.startedAt), session.status]);

  return (
    <div className="section-grid grid-2">
      <article className="card card-pad">
        <p className="eyebrow">Sesiones activas</p>
        <h2 style={{ margin: 0 }}>Control de accesos</h2>
        {rows.length ? <DataTable columns={["Usuario", "Dispositivo", "Navegador", "IP", "Ubicacion", "Inicio", "Estado"]} rows={rows} /> : <EmptyState title="No hay sesiones activas registradas" description="Las sesiones apareceran cuando se active el registro de accesos." />}
      </article>
      <article className="card card-pad">
        <p className="eyebrow">Bloqueos</p>
        <h2 style={{ margin: 0 }}>Usuarios bloqueados</h2>
        {blockedUsers.length ? blockedUsers.map((user) => (
          <div className="security-row" key={user.id}>
            <div><strong>{user.fullName}</strong><span>{user.email}</span></div>
            <Button variant="secondary" onClick={async () => { await updateAdminUserStatus(user, "Activo", "Desbloqueo administrativo"); await onRefresh(); }}><CheckCircle2 size={17} /> Desbloquear</Button>
          </div>
        )) : <p className="muted">No hay usuarios bloqueados.</p>}
      </article>
    </div>
  );
}

function SettingsFilters({ query, setQuery, filters }: { query: string; setQuery: (value: string) => void; filters: Array<{ value: string; onChange: (value: string) => void; options: string[]; label: string; render?: (value: string) => string }> }) {
  return (
    <div className="settings-filters">
      <label><Search size={16} /><Input value={query} placeholder="Buscar por nombre, correo, area, rol o accion" onChange={(event) => setQuery(event.target.value)} /></label>
      {filters.map((filter) => (
        <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)} aria-label={filter.label} key={filter.label}>
          {filter.options.map((option) => <option value={option} key={option}>{filter.render ? filter.render(option) : option}</option>)}
        </Select>
      ))}
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="settings-empty"><strong>{title}</strong><span>{description}</span>{action}</div>;
}

function StatusPill({ status }: { status: AdminUserStatus }) {
  return <span className={`settings-status settings-status-${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

function blankUser(role: string): AdminUser {
  return {
    id: crypto.randomUUID(),
    firstName: "",
    lastName: "",
    fullName: "",
    email: "",
    area: "Ventas",
    role,
    status: "Pendiente de invitacion",
    createdAt: ""
  };
}

function blankRole(): AdminRole {
  return {
    id: crypto.randomUUID(),
    code: `rol_${Date.now()}`,
    name: "Nuevo rol",
    description: "",
    accessLevel: 10,
    status: "Personalizado",
    systemRole: false,
    usersCount: 0
  };
}

function roleLabel(roleCode: string, roles: AdminRole[]) {
  return roles.find((role) => role.code === roleCode)?.name ?? roleCode;
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
