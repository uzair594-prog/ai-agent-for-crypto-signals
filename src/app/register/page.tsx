"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await response.json();
      setMessage(response.ok ? body.message : (body.error ?? "Unable to register."));
    } catch {
      setMessage("Registration is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b1020", color: "#f7f8fc" }}>
      <section style={{ width: "100%", maxWidth: 420, border: "1px solid #293149", borderRadius: 20, padding: 28, background: "#11182a" }}>
        <p style={{ color: "#8da8ff", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Market intelligence</p>
        <h1 style={{ fontSize: 30, margin: "8px 0" }}>Create account</h1>
        <p style={{ color: "#aab4ca", fontSize: 14 }}>Email verification is required before password sign-in.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 22 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Name (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Password (at least 12 characters)
            <input required minLength={12} maxLength={128} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />
          </label>
          {message && <p role="status" style={{ color: "#aab4ca", fontSize: 13 }}>{message}</p>}
          <button disabled={busy} type="submit" style={{ padding: 12, border: 0, borderRadius: 10, background: "#91a8ff", color: "#0b1020", fontWeight: 700 }}>{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p style={{ color: "#aab4ca", fontSize: 13, marginTop: 18 }}>Already registered? <a href="/login" style={{ color: "#a9bbff" }}>Sign in</a></p>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 9, border: "1px solid #3a4560", background: "#0c1323", color: "#f7f8fc" };
