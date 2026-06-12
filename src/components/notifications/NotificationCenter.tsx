"use client";

import { Bell, CheckCircle2, NotebookPen, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { subscribeCommercialDataChange } from "@/lib/commercial/events";
import { getCommercialState, setCommercialState } from "@/lib/commercial/store";
import type { CommercialNotification, UserReminder } from "@/lib/commercial/types";

function canSee(notification: CommercialNotification, role: string) {
  const normalized = role.toLowerCase();
  if (notification.audience === "Todos") return true;
  if (notification.audience === "Ejecutivos") return normalized.includes("ejecutivo") || normalized.includes("lider");
  if (notification.audience === "Jefatura") return normalized.includes("jefe") || normalized.includes("lider") || normalized.includes("admin") || normalized.includes("super");
  if (notification.audience === "Gerencia") return normalized.includes("gerencia") || normalized.includes("admin") || normalized.includes("super");
  return false;
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 820;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // El navegador puede bloquear audio hasta la primera interaccion.
  }
}

export function NotificationCenter({ profileName, role }: { profileName: string; role: string }) {
  const [state, setState] = useState(getCommercialState);
  const [open, setOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDraft, setReminderDraft] = useState("");

  useEffect(() => subscribeCommercialDataChange(() => setState(getCommercialState())), []);

  useEffect(() => {
    let alive = true;
    fetch("/api/commercial/notifications", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!alive || !payload?.data?.notifications?.length) return;
        const current = getCommercialState();
        const next = { ...current, notifications: payload.data.notifications };
        setState(next);
        setCommercialState(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const visibleNotifications = useMemo(
    () => state.notifications.filter((item) => item.active && canSee(item, role)),
    [role, state.notifications]
  );
  const unread = visibleNotifications.filter((item) => !item.readBy.includes(profileName));

  useEffect(() => {
    if (!unread.length) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      playNotificationSound();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [unread.length]);

  function markRead(notificationId?: string) {
    const next = {
      ...state,
      notifications: state.notifications.map((item) =>
        (!notificationId || item.id === notificationId) && !item.readBy.includes(profileName)
          ? { ...item, readBy: [...item.readBy, profileName] }
          : item
      )
    };
    setState(next);
    setCommercialState(next);
    const changed = next.notifications.find((item) => item.id === notificationId);
    if (changed) {
      fetch("/api/commercial/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification: changed })
      }).catch(() => undefined);
    }
  }

  function authorize(notification: CommercialNotification, approved: boolean) {
    if (notification.requestStatus && notification.requestStatus !== "Pendiente") return;
    const next = {
      ...state,
      notifications: state.notifications.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              requestStatus: approved ? "Autorizado" as const : "Rechazado" as const,
              authorizedBy: profileName,
              authorizedAt: new Date().toLocaleString("es-PE"),
              readBy: item.readBy.includes(profileName) ? item.readBy : [...item.readBy, profileName]
            }
          : item
      )
    };
    setState(next);
    setCommercialState(next);
    const changed = next.notifications.find((item) => item.id === notification.id);
    if (changed) {
      fetch("/api/commercial/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification: changed })
      }).catch(() => undefined);
    }
  }

  function saveReminder() {
    if (!reminderDraft.trim()) return;
    const reminder: UserReminder = {
      id: `reminder-${crypto.randomUUID()}`,
      title: reminderDraft.trim(),
      note: reminderDraft.trim(),
      createdAt: new Date().toLocaleString("es-PE"),
      createdBy: profileName,
      completed: false
    };
    const next = { ...state, reminders: [reminder, ...state.reminders] };
    setState(next);
    setCommercialState(next);
    setReminderDraft("");
    setReminderOpen(false);
  }

  return (
    <>
      <button className="icon-button notification-button" onClick={() => { setOpen(true); if (unread.length) playNotificationSound(); }} title="Notificaciones">
        <Bell size={18} />
        {unread.length ? <span>{unread.length}</span> : null}
      </button>
      <button className="icon-button" onClick={() => setReminderOpen(true)} title="Notas y recordatorios">
        <NotebookPen size={18} />
      </button>

      {open ? (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(680px, 94vw)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <p className="eyebrow">Notificaciones</p>
                <h2>Comunicados activos</h2>
              </div>
              <button className="ghost-button" onClick={() => playNotificationSound()}><Volume2 size={16} /> Sonido</button>
            </div>
            <div className="grid" style={{ marginTop: 14 }}>
              {visibleNotifications.length ? visibleNotifications.map((notification) => (
                <div className="card" style={{ boxShadow: "none" }} key={notification.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong>{notification.title}</strong>
                      <p className="muted">{notification.type} - {notification.audience} - {notification.createdAt}</p>
                    </div>
                    {notification.readBy.includes(profileName) ? <span className="badge"><CheckCircle2 size={15} /> Leido</span> : null}
                  </div>
                  <p>{notification.message}</p>
                  {notification.requestStatus ? (
                    <p className="badge">
                      {notification.requestStatus}
                      {notification.authorizedBy ? ` por ${notification.authorizedBy}` : ""}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
                    {notification.type === "Autorizacion descuento" && notification.requestStatus === "Pendiente" ? (
                      <>
                        <button className="ghost-button" onClick={() => authorize(notification, false)}>Rechazar</button>
                        <button className="primary-button" onClick={() => authorize(notification, true)}>Autorizar</button>
                      </>
                    ) : null}
                    <button className="ghost-button" onClick={() => markRead(notification.id)}>Marcar leida</button>
                  </div>
                </div>
              )) : <p className="muted">No hay notificaciones activas.</p>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => markRead()}>Marcar todo leido</button>
              <button className="primary-button" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      ) : null}

      {reminderOpen ? (
        <div className="modal-backdrop">
          <div className="modal" style={{ width: "min(520px, 94vw)" }}>
            <p className="eyebrow">Notas</p>
            <h2>Nuevo recordatorio</h2>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Nota personal</label>
              <textarea autoFocus value={reminderDraft} onChange={(event) => setReminderDraft(event.target.value)} placeholder="Ej. Revisar descuentos pendientes antes del cierre" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="ghost-button" onClick={() => setReminderOpen(false)}>Cancelar</button>
              <button className="primary-button" onClick={saveReminder}>Guardar</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
