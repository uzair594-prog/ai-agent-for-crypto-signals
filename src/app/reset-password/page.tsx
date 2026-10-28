"use client";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "confirm", token, password }),
      });
      const body = await response.json();
      setMessage(response.ok ? body.message : body.error ?? "Unable to reset password.");
    } catch {
      setMessage("Password reset is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b1020", color: "#f7f8fc" }}>
    <form onSubmit={submit} style={{ width: "100%", maxWidth: 420, display: "grid", gap: 14, padding: 28, background: "#11182a", border: "1px solid #293149", borderRadius: 20 }}>
      <h1>Choose a new password</h1>
      <label>New password (12+ characters)<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} style={{ display: "block", width: "100%", padding: 12, marginTop: 8, boxSizing: "border-box" }} /></label>
      {message && <p role="status">{message}</p>}
      <button disabled={busy || !token} type="submit">{busy ? "Updating…" : "Update password"}</button>
      <a href="/login">Back to sign in</a>
    </form>
  </main>;
}
