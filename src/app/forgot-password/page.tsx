"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request", email }),
      });
      const body = await response.json();
      setMessage(response.ok ? body.message : (body.error ?? "Unable to request a reset."));
    } catch {
      setMessage("Password reset is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b1020", color: "#f7f8fc" }}>
    <section style={{ width: "100%", maxWidth: 420, border: "1px solid #293149", borderRadius: 20, padding: 28, background: "#11182a" }}>
      <h1 style={{ fontSize: 28 }}>Reset password</h1>
      <p style={{ color: "#aab4ca", fontSize: 14 }}>If an eligible account exists, we will email a one-time reset link.</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 20 }}>
        <label style={{ display: "grid", gap: 6 }}>Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></label>
        {message && <p role="status" style={{ color: "#aab4ca", fontSize: 13 }}>{message}</p>}
        <button disabled={busy} type="submit" style={buttonStyle}>{busy ? "Sending…" : "Send reset link"}</button>
      </form>
      <p style={{ marginTop: 16 }}><a href="/login" style={{ color: "#a9bbff" }}>Back to sign in</a></p>
    </section>
  </main>;
}

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 9, border: "1px solid #3a4560", background: "#0c1323", color: "#f7f8fc" };
const buttonStyle: React.CSSProperties = { padding: 12, border: 0, borderRadius: 10, background: "#91a8ff", color: "#0b1020", fontWeight: 700 };
