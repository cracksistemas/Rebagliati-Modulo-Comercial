"use client";

import { useEffect, useState } from "react";
import { CalendarDays, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { subscribeProfileChange } from "@/lib/commercial/events";
import { demoProfile, loadCurrentProfile, type SessionProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";

export function Topbar() {
  const [profile, setProfile] = useState<SessionProfile>(demoProfile);

  useEffect(() => {
    hydrateProfile();
    return subscribeProfileChange(hydrateProfile);
  }, []);

  async function hydrateProfile() {
    try {
      const currentProfile = await loadCurrentProfile();
      if (currentProfile) setProfile(currentProfile);
    } catch (error) {
      console.warn(error);
    }
  }

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Panel interno</p>
        <h1>Ranking de Ventas - Junio 2026</h1>
      </div>
      <div className="topbar-actions">
        <Button variant="secondary">
          <CalendarDays size={17} />
          Junio 2026
        </Button>
        <div className="profile-chip">
          <Avatar src={profile.avatarUrl} name={profile.fullName} size="sm" />
          <span>{profile.fullName}</span>
        </div>
        <Button variant="danger" onClick={handleSignOut}>
          <LogOut size={17} />
          Cerrar sesion
        </Button>
      </div>
    </header>
  );
}
