"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await signIn("credentials", {
        email,
        password,
        mfaCode,
        redirect: false,
      });
      if (result?.error) setMessage("Sign-in failed. Check your details, email verification and authenticator code.");
      else window.location.assign("/dashboard");
    } catch {
      setMessage("Sign-in is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b1020", color: "#f7f8fc" }}>
      <section style={{ width: "100%", maxWidth: 420, border: "1px solid #293149", borderRadius: 20, padding: 28, background: "#11182a" }}>
        <p style={{ color: "#8da8ff", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Market intelligence</p>
        <h1 style={{ fontSize: 30, margin: "8px 0" }}>Sign in</h1>
        <p style={{ color: "#aab4ca", fontSize: 14 }}>Access your research workspace securely.</p>
        {process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" && <>
          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })} style={{ width: "100%", padding: 12, margin: "20px 0 14px", borderRadius: 10, border: "1px solid #3a4560", background: "#18223a", color: "white", cursor: "pointer" }}>Continue with Google</button>
          <div style={{ borderTop: "1px solid #293149", margin: "12px 0 20px" }} />
        </>}
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Password
            <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>Authenticator code (if enabled)
            <input inputMode="numeric" autoComplete="one-time-code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} maxLength={16} style={inputStyle} />
          </label>
          {message && <p role="alert" style={{ color: "#ffb4b4", fontSize: 13 }}>{message}</p>}
          <button disabled={busy} type="submit" style={{ padding: 12, border: 0, borderRadius: 10, background: "#91a8ff", color: "#0b1020", fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>{busy ? "Signing in…" : "Sign in with email"}</button>
        </form>
        <p style={{ color: "#aab4ca", fontSize: 13, marginTop: 18 }}>New here? <a href="/register" style={{ color: "#a9bbff" }}>Create an account</a></p>
        <p style={{ color: "#aab4ca", fontSize: 13 }}><a href="/forgot-password" style={{ color: "#a9bbff" }}>Forgot password?</a></p>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 9, border: "1px solid #3a4560", background: "#0c1323", color: "#f7f8fc" };
