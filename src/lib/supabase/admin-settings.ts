import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/sales";

export type AdminUserStatus = "Activo" | "Inactivo" | "Pendiente de invitacion" | "Bloqueado" | "Archivado";
export type AdminSection = "overview" | "users" | "roles" | "audit" | "security";

export interface AdminUser {
  id: string;
  profileId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  area: string;
  role: string;
  status: AdminUserStatus;
  phone?: string;
  jobTitle?: string;
  location?: string;
  internalNotes?: string;
  lastAccessAt?: string;
  createdAt: string;
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string;
  accessLevel: number;
  status: "Activo" | "Inactivo" | "Sistema" | "Personalizado";
  systemRole: boolean;
  usersCount: number;
  updatedAt?: string;
}

export interface AdminPermission {
  module: string;
  action: string;
  allowed: boolean;
  scope: string;
}

export interface AuditEvent {
  id: string;
  createdAt: string;
  userName: string;
  action: string;
  module: string;
  recordId?: string;
  result: string;
  criticality: string;
  ipAddress?: string;
  oldData?: unknown;
  newData?: unknown;
}

export interface AdminSession {
  id: string;
  userEmail: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  startedAt: string;
  lastActivityAt?: string;
  status: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin_sistema: "Superadministrador",
  gerencia: "Administrador",
  jefe_ventas: "Ventas",
  lider_ventas: "Jefe de area",
  ejecutivo: "Usuario operativo",
  marketing_soporte: "Solo lectura"
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin_sistema: "Control total de usuarios, roles, auditoria y seguridad.",
  gerencia: "Gestion comercial completa y auditoria gerencial.",
  jefe_ventas: "Gestion de equipos, validacion comercial y metas.",
  lider_ventas: "Seguimiento y validacion del equipo asignado.",
  ejecutivo: "Registro de ventas propias y seguimiento personal.",
  marketing_soporte: "Lectura de dashboard y reportes operativos."
};

export const permissionMatrix: Array<{ module: string; actions: string[]; scopes: string[] }> = [
  { module: "Ventas", actions: ["Ver ventas", "Registrar ventas", "Validar ventas", "Anular ventas", "Exportar ventas"], scopes: ["No permitir", "Solo propios", "Por area", "Todos"] },
  { module: "Equipos", actions: ["Ver equipos", "Crear equipos", "Editar equipos", "Asignar ejecutivos"], scopes: ["No permitir", "Por area", "Todos"] },
  { module: "Usuarios", actions: ["Ver usuarios", "Crear usuarios", "Editar usuarios", "Desactivar usuarios", "Cambiar roles"], scopes: ["No permitir", "Por area", "Todos"] },
  { module: "Reportes", actions: ["Ver reportes", "Exportar reportes", "Ver metricas financieras"], scopes: ["No permitir", "Solo su area", "Todas las areas"] },
  { module: "Configuracion", actions: ["Ver configuracion", "Editar configuracion", "Ver auditoria", "Exportar auditoria", "Gestionar sesiones"], scopes: ["No permitir", "Solo lectura", "Total"] }
];

export function getBaseRoles(users: AdminUser[] = []): AdminRole[] {
  return (Object.keys(ROLE_LABELS) as UserRole[]).map((role, index) => ({
    id: role,
    code: role,
    name: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
    accessLevel: [100, 80, 60, 45, 20, 15][index] ?? 10,
    status: "Sistema",
    systemRole: true,
    usersCount: users.filter((user) => user.role === role).length
  }));
}

export function getRolePermissions(roleCode: string): AdminPermission[] {
  const highAccess = roleCode === "admin_sistema" || roleCode === "gerencia";
  const salesAccess = highAccess || roleCode === "jefe_ventas" || roleCode === "lider_ventas";

  return permissionMatrix.flatMap((group) =>
    group.actions.map((action) => {
      const isSettings = group.module === "Configuracion" || group.module === "Usuarios";
      const allowed = highAccess || (salesAccess && !isSettings && action !== "Exportar auditoria");
      return {
        module: group.module,
        action,
        allowed,
        scope: allowed ? (highAccess ? "Todos" : "Por area") : "No permitir"
      };
    })
  );
}

function supabase() {
  return createClient() as any;
}

export async function loadAdminUsers(): Promise<AdminUser[]> {
  const client = supabase();
  const { data, error } = await client
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) return data.map(mapAdminUser);

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("id,full_name,email,role,active,created_at,area,profile_status,phone,job_title,location,internal_notes,last_access_at")
    .order("created_at", { ascending: false });

  if (profilesError) throw profilesError;
  return (profiles ?? []).map((profile: any) => {
    const [firstName, ...rest] = String(profile.full_name ?? "Usuario").split(" ");
    return {
      id: profile.id,
      profileId: profile.id,
      firstName,
      lastName: rest.join(" "),
      fullName: profile.full_name ?? "Usuario",
      email: profile.email ?? "",
      area: profile.area ?? "Comercial",
      role: profile.role,
      status: profile.profile_status ?? (profile.active ? "Activo" : "Inactivo"),
      phone: profile.phone ?? "",
      jobTitle: profile.job_title ?? "",
      location: profile.location ?? "",
      internalNotes: profile.internal_notes ?? "",
      lastAccessAt: profile.last_access_at ?? undefined,
      createdAt: profile.created_at
    };
  });
}

export async function loadAdminRoles(users: AdminUser[]): Promise<AdminRole[]> {
  const client = supabase();
  const { data, error } = await client
    .from("admin_roles")
    .select("id,code,name,description,access_level,status,system_role,updated_at")
    .order("access_level", { ascending: false });

  if (error || !data) return getBaseRoles(users);

  return data.map((role: any) => ({
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description ?? "",
    accessLevel: Number(role.access_level ?? 10),
    status: role.status ?? (role.system_role ? "Sistema" : "Activo"),
    systemRole: Boolean(role.system_role),
    usersCount: users.filter((user) => user.role === role.code).length,
    updatedAt: role.updated_at
  }));
}

export async function loadAuditEvents(): Promise<AuditEvent[]> {
  const client = supabase();
  const { data, error } = await client
    .from("audit_logs")
    .select("id,created_at,user_id,action,table_name,record_id,result,criticality,ip_address,old_data,new_data,module,action_type,profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) return [];

  return (data ?? []).map((event: any) => ({
    id: event.id,
    createdAt: event.created_at,
    userName: event.profiles?.full_name ?? "Sistema",
    action: event.action_type ?? event.action ?? "Accion",
    module: event.module ?? event.table_name ?? "Sistema",
    recordId: event.record_id ?? undefined,
    result: event.result ?? "Exitoso",
    criticality: event.criticality ?? "Media",
    ipAddress: event.ip_address ?? "",
    oldData: event.old_data,
    newData: event.new_data
  }));
}

export async function loadAdminSessions(): Promise<AdminSession[]> {
  const client = supabase();
  const { data, error } = await client
    .from("admin_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return data.map((session: any) => ({
    id: session.id,
    userEmail: session.user_email,
    device: session.device ?? "Dispositivo no identificado",
    browser: session.browser ?? "Navegador no identificado",
    ipAddress: session.ip_address ?? "",
    location: session.location ?? "",
    startedAt: session.started_at,
    lastActivityAt: session.last_activity_at ?? undefined,
    status: session.status
  }));
}

export async function saveAdminUser(user: AdminUser) {
  const client = supabase();
  const { error } = await client.from("admin_users").upsert({
    id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    area: user.area,
    role: user.role,
    status: user.status,
    phone: user.phone || null,
    job_title: user.jobTitle || null,
    location: user.location || null,
    internal_notes: user.internalNotes || null,
    created_by: await getCurrentUserId()
  });

  if (error) throw error;
  await logAdminAction("Usuarios", user.createdAt ? "Edito usuario" : "Creo usuario", user.id, null, user, "Alta");
}

export async function updateAdminUserStatus(user: AdminUser, status: AdminUserStatus, reason: string) {
  const client = supabase();
  const { error } = await client
    .from("admin_users")
    .update({ status, internal_notes: [user.internalNotes, reason].filter(Boolean).join("\n") })
    .eq("id", user.id);

  if (error) throw error;
  await logAdminAction("Usuarios", `${status} usuario`, user.id, user, { ...user, status, reason }, status === "Bloqueado" ? "Critica" : "Alta");
}

export async function saveAdminRole(role: AdminRole, permissions: AdminPermission[]) {
  const client = supabase();
  const { error } = await client.from("admin_roles").upsert({
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    access_level: role.accessLevel,
    status: role.systemRole ? "Sistema" : role.status,
    system_role: role.systemRole,
    created_by: await getCurrentUserId()
  });

  if (error) throw error;

  const rows = permissions.map((permission) => ({
    role_code: role.code,
    module: permission.module,
    action: permission.action,
    allowed: permission.allowed,
    scope: permission.scope
  }));

  const { error: permissionError } = await client
    .from("admin_role_permissions")
    .upsert(rows, { onConflict: "role_code,module,action" });

  if (permissionError) throw permissionError;
  await logAdminAction("Roles y permisos", "Edito permisos", role.id, null, { role, permissions }, "Critica");
}

export async function logAdminAction(module: string, action: string, recordId?: string, oldData?: unknown, newData?: unknown, criticality = "Media") {
  const client = supabase();
  await client.rpc("log_admin_event", {
    p_module: module,
    p_action_type: action,
    p_record_id: recordId ?? null,
    p_old_data: oldData ?? null,
    p_new_data: newData ?? null,
    p_result: "Exitoso",
    p_criticality: criticality,
    p_metadata: {}
  });
}

async function getCurrentUserId() {
  const client = supabase();
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

function mapAdminUser(row: any): AdminUser {
  return {
    id: row.id,
    profileId: row.profile_id ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name ?? `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    area: row.area,
    role: row.role,
    status: row.status,
    phone: row.phone ?? "",
    jobTitle: row.job_title ?? "",
    location: row.location ?? "",
    internalNotes: row.internal_notes ?? "",
    lastAccessAt: row.last_access_at ?? undefined,
    createdAt: row.created_at
  };
}
