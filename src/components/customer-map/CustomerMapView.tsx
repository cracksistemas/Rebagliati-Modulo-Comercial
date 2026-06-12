"use client";

import { BookOpen, Check, Copy, GitCompare, Search, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { getCommercialState } from "@/lib/commercial/store";
import type { ClientProfile } from "@/lib/commercial/types";

function commonItems(a: string[], b: string[]) {
  const right = new Set(b.map((item) => item.toLowerCase()));
  return a.filter((item) => right.has(item.toLowerCase()));
}

function differentItems(a: string[], b: string[]) {
  const right = new Set(b.map((item) => item.toLowerCase()));
  return a.filter((item) => !right.has(item.toLowerCase()));
}

export function CustomerMapView() {
  const state = getCommercialState();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "map">("cards");
  const [selected, setSelected] = useState<ClientProfile>(state.clientProfiles[0]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareWithId, setCompareWithId] = useState(state.clientProfiles[1]?.id ?? state.clientProfiles[0]?.id);
  const [copied, setCopied] = useState("");

  const profiles = useMemo(
    () =>
      state.clientProfiles.filter((profile) =>
        `${profile.name} ${profile.pain} ${profile.motivator} ${profile.pains.join(" ")} ${profile.programs.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query, state.clientProfiles]
  );

  const compareOptions = state.clientProfiles.filter((profile) => profile.id !== selected.id);
  const compareWith = compareOptions.find((profile) => profile.id === compareWithId) ?? compareOptions[0] ?? selected;

  function selectProfile(profile: ClientProfile, nextView: "cards" | "map" = view) {
    setSelected(profile);
    const nextComparable = state.clientProfiles.find((item) => item.id !== profile.id);
    if (nextComparable) setCompareWithId(nextComparable.id);
    setView(nextView);
  }

  async function copyMessage(message: string) {
    await navigator.clipboard?.writeText(message);
    setCopied(message);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <div className="grid">
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Puntos de dolor y perfil comercial</p>
            <h2>Mapa de Clientes</h2>
            <p className="muted">Perfiles, motivadores, objeciones, argumentos y oportunidades comerciales.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className={view === "cards" ? "primary-button" : "ghost-button"} onClick={() => setView("cards")}>Vista tarjetas</button>
            <button className={view === "map" ? "primary-button" : "ghost-button"} onClick={() => setView("map")}>Vista mapa visual</button>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Buscador inteligente</label>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 14, top: 14, color: "#8E8E93" }} />
            <input
              style={{ paddingLeft: 42, width: "100%" }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="recertificacion, CV, costos economicos, primer empleo, virtual"
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {state.clientProfiles.map((profile) => (
            <button
              className={selected.id === profile.id ? "primary-button" : "ghost-button"}
              key={profile.id}
              onClick={() => selectProfile(profile)}
            >
              {profile.name}
            </button>
          ))}
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="primary-button" onClick={() => selectProfile(profile, "map")}><Target size={16} /> Ver perfil</button>
                <button className="ghost-button" onClick={() => { selectProfile(profile); setCompareOpen(true); }}><GitCompare size={16} /> Comparar</button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="card">
          <div className="client-map-orbit">
            <div className="grid">
              <p className="eyebrow">Motivadores</p>
              {selected.motivators.map((item) => <span className="badge insight-chip" key={item}><Sparkles size={14} /> {item}</span>)}
            </div>
            <div className="client-avatar-scene" style={{ textAlign: "center" }}>
              <div className="client-avatar-3d" aria-label={`Avatar visual de ${selected.name}`}>
                <div className="head"><div className="face" /></div>
                <div className="body" />
                <div className="shadow" />
              </div>
              <h2>{selected.name}</h2>
              <p className="muted">{selected.description}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="badge">Temperatura: {selected.urgency}</span>
                <span className="badge">Precio: {selected.priceSensitivity}</span>
              </div>
            </div>
            <div className="grid">
              <p className="eyebrow">Puntos de dolor</p>
              {selected.pains.map((item) => <span className="badge insight-chip" key={item}><Target size={14} /> {item}</span>)}
            </div>
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
            <div>
              <strong>Programas recomendados</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {selected.programs.map((program) => <span className="badge" key={program}><BookOpen size={14} /> {program}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Guia de conversacion</p>
          <h2>Mensajes sugeridos</h2>
          {selected.messages.map((message) => (
            <div className="card" style={{ boxShadow: "none", marginBottom: 10 }} key={message}>
              <p>{message}</p>
              <button className="ghost-button" onClick={() => copyMessage(message)}>
                {copied === message ? <Check size={16} /> : <Copy size={16} />}
                {copied === message ? "Copiado" : "Copiar"}
              </button>
            </div>
          ))}
          <button className="ghost-button" onClick={() => setCompareOpen(true)}><GitCompare size={16} /> Comparar perfiles</button>
        </div>
      </section>

      {compareOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <p className="eyebrow">Comparador comercial</p>
                <h2>{selected.name} vs {compareWith.name}</h2>
              </div>
              <button className="ghost-button" onClick={() => setCompareOpen(false)}>Cerrar</button>
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Comparar contra</label>
              <select value={compareWith.id} onChange={(event) => setCompareWithId(event.target.value)}>
                {compareOptions.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-3" style={{ marginTop: 16 }}>
              <div className="card" style={{ boxShadow: "none" }}>
                <p className="eyebrow">Dolores comunes</p>
                {commonItems(selected.pains, compareWith.pains).length ? commonItems(selected.pains, compareWith.pains).map((item) => <p key={item} className="badge">{item}</p>) : <p className="muted">No hay coincidencias directas.</p>}
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <p className="eyebrow">{selected.name}</p>
                {differentItems(selected.pains, compareWith.pains).map((item) => <p key={item} className="badge">{item}</p>)}
                <p className="muted">Precio: {selected.priceSensitivity} · Frecuencia: {selected.frequency}</p>
              </div>
              <div className="card" style={{ boxShadow: "none" }}>
                <p className="eyebrow">{compareWith.name}</p>
                {differentItems(compareWith.pains, selected.pains).map((item) => <p key={item} className="badge">{item}</p>)}
                <p className="muted">Precio: {compareWith.priceSensitivity} · Frecuencia: {compareWith.frequency}</p>
              </div>
            </div>
            <div className="card" style={{ boxShadow: "none", marginTop: 16 }}>
              <strong>Argumento recomendado para {selected.name}</strong>
              <p className="muted">{selected.arguments[0]}</p>
              <strong>Argumento recomendado para {compareWith.name}</strong>
              <p className="muted">{compareWith.arguments[0]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
