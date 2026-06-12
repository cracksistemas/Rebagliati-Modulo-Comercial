"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function login() {
    setLoading(true);
    setErrorMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErrorMessage("Correo o contrasena incorrectos.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get("next");
    const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

    router.replace(safeNextPath);
    router.refresh();
  }

  return (
    <div className="modal-backdrop" style={{ background: "#F5F5F7" }}>
      <section className="card" style={{ width: "min(440px, 92vw)" }}>
        <div className="brand" style={{ marginBottom: 22 }}>
          <div className="brand-mark"><img src="/brand/rebagliati-logo.webp" alt="Rebagliati" /></div>
          <div>
            <strong>Rebagliati Diplomados</strong>
            <div className="muted">Modulo comercial interno</div>
          </div>
        </div>
        <h1 style={{ fontSize: "2.2rem", marginBottom: 12 }}>Iniciar sesion</h1>
        <div className="field"><label>Correo</label><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></div>
        <div className="field" style={{ marginTop: 12 }}><label>Contraseña</label><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></div>
        {errorMessage ? <p style={{ color: "#FF3B30", marginTop: 12 }}>{errorMessage}</p> : null}
        <button className="primary-button" style={{ width: "100%", marginTop: 18 }} onClick={login} disabled={loading}>{loading ? "Preparando panel..." : "Entrar"}</button>
      </section>
    </div>
  );
}
