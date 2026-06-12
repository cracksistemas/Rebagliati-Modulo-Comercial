"use client";

import { Copy, GitCompare, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getCommercialState } from "@/lib/commercial/store";

export function CustomerMapView() {
  const state = getCommercialState();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "map">("cards");
  const [selected, setSelected] = useState(state.clientProfiles[0]);

  const profiles = useMemo(
    () => state.clientProfiles.filter((profile) => `${profile.name} ${profile.pain} ${profile.motivator} ${profile.programs.join(" ")}`.toLowerCase().includes(query.toLowerCase())),
    [query, state.clientProfiles]
  );

  return (
    <div className="grid">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Puntos de dolor y perfil comercial</p>
            <h2>Mapa de Clientes</h2>
            <p className="muted">Perfiles, motivadores, objeciones, argumentos y oportunidades comerciales.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className={view === "cards" ? "primary-button" : "ghost-button"} onClick={() => setView("cards")}>Vista tarjetas</button>
            <button className={view === "map" ? "primary-button" : "ghost-button"} onClick={() => setView("map")}>Vista mapa visual</button>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Buscador inteligente</label>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: 14, color: "#8E8E93" }} />
            <input style={{ paddingLeft: 42, width: "100%" }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="recertificacion, CV, costos economicos, primer empleo, virtual" />
          </div>
        </div>
      </section>

      {view === "cards" ? (
        <section className="grid grid-3">
          {profiles.map((profile) => (
            <article className="card" key={profile.id}>
              <span className="badge">{profile.status}</span>
              <h2 style={{ marginTop: 12 }}>{profile.name}</h2>
              <p>{profile.description}</p>
              <p><strong>Dolor principal:</strong><br />{profile.pain}</p>
              <p><strong>Motivador:</strong><br />{profile.motivator}</p>
              <p className="muted">Frecuencia: {profile.frequency} · Lealtad: {profile.loyalty}</p>
              <button className="primary-button" onClick={() => setSelected(profile)}>Ver perfil</button>
            </article>
          ))}
        </section>
      ) : (
        <section className="card">
          <div className="grid grid-3" style={{ alignItems: "center" }}>
            <div className="grid">{selected.motivators.map((item) => <span className="badge" key={item}>{item}</span>)}</div>
            <div style={{ textAlign: "center" }}>
              <div className="avatar" style={{ width: 150, height: 150, margin: "0 auto 16px", fontSize: 42 }}>{selected.name[0]}</div>
              <h2>{selected.name}</h2>
              <p className="muted">{selected.description}</p>
              <span className="badge">Temperatura: {selected.urgency}</span>
            </div>
            <div className="grid">{selected.pains.map((item) => <span className="badge" key={item}>{item}</span>)}</div>
          </div>
        </section>
      )}

      <section className="grid grid-2">
        <div className="card">
          <p className="eyebrow">Ficha individual</p>
          <h2>{selected.name}</h2>
          <div className="grid">
            <div><strong>Que le duele</strong><p className="muted">{selected.pain}</p></div>
            <div><strong>Que quiere lograr</strong><p className="muted">{selected.motivator}</p></div>
            <div><strong>Que decirle</strong><p className="muted">{selected.arguments[0]}</p></div>
            <div><strong>Que curso recomendar</strong><p className="muted">{selected.programs.join(", ")}</p></div>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Guia de conversacion</p>
          <h2>Mensajes sugeridos</h2>
          {selected.messages.map((message) => (
            <div className="card" style={{ boxShadow: "none", marginBottom: 10 }} key={message}>
              <p>{message}</p>
              <button className="ghost-button" onClick={() => navigator.clipboard?.writeText(message)}><Copy size={16} /> Copiar</button>
            </div>
          ))}
          <button className="ghost-button"><GitCompare size={16} /> Comparar perfiles</button>
        </div>
      </section>
    </div>
  );
}
