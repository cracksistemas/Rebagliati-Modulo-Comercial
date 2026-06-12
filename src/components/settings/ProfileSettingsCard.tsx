"use client";

import { useEffect, useState } from "react";
import { Save, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { broadcastProfileChange } from "@/lib/commercial/events";
import { loadCurrentProfile, updateCurrentProfileName, type SessionProfile } from "@/lib/supabase/auth";

export function ProfileSettingsCard() {
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hydrateProfile();
  }, []);

  async function hydrateProfile() {
    try {
      const currentProfile = await loadCurrentProfile();
      setProfile(currentProfile);
      setFullName(currentProfile?.fullName ?? "");
    } catch (error) {
      console.warn(error);
    }
  }

  async function saveProfileName() {
    const nextName = fullName.trim();
    if (!nextName) {
      setStatus("Ingresa un nombre para mostrar.");
      return;
    }

    setLoading(true);
    setStatus("Guardando...");

    try {
      const updatedProfile = await updateCurrentProfileName(nextName);
      setProfile(updatedProfile);
      setFullName(updatedProfile.fullName);
      broadcastProfileChange();
      setStatus("Nombre actualizado.");
    } catch (error) {
      console.warn(error);
      setStatus("No se pudo guardar el nombre.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="card card-pad">
      <UserRound size={30} color="#00a7eb" />
      <p className="eyebrow" style={{ marginTop: 18 }}>Perfil de usuario</p>
      <h2 style={{ margin: 0 }}>Nombre dentro del sistema</h2>
      <p className="muted">Este nombre se mostrara en la barra superior y en las vistas internas.</p>
      <div className="profile-photo-inline" style={{ marginTop: 18 }}>
        <Avatar src={profile?.avatarUrl} name={fullName || "Usuario"} size="lg" />
        <div style={{ flex: 1 }}>
          <label className="field-stack">
            Nombre visible
            <Input value={fullName} placeholder="Ej. Gerencia Comercial" onChange={(event) => setFullName(event.target.value)} />
          </label>
        </div>
      </div>
      <div className="editor-actions">
        <Button type="button" disabled={loading} onClick={saveProfileName}>
          <Save size={17} />
          {loading ? "Guardando..." : "Guardar nombre"}
        </Button>
      </div>
      {status ? <p className="login-status">{status}</p> : null}
    </article>
  );
}
