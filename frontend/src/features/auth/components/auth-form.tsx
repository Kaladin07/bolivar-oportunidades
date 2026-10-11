"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { clientRequest } from "@/shared/api/client-request";
import { dictionary, type Locale } from "@/shared/i18n/i18n";

export function AuthForm({ locale, mode, initialRole }: { locale: Locale; mode: "login" | "register"; initialRole?: string }) {
  const d = dictionary(locale);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialRole === "PROVIDER" ? "PROVIDER" : "YOUTH");
  const [location, setLocation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = mode === "register" ? { email, password, role, location, displayName: role === "PROVIDER" ? displayName : undefined } : { email, password };
      await clientRequest(`auth/${mode}`, { method: "POST", body: JSON.stringify(body) });
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(d.errorGeneric);
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <div className="auth-aside"><span className="section-kicker">{d.eyebrow}</span><h1>{mode === "register" ? d.accountTitle : d.loginTitle}</h1><p>{mode === "register" ? d.accountText : d.loginText}</p><div className="auth-decor">✦</div></div>
    <div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}>
      <span className="section-kicker">{mode === "register" ? d.register : d.login}</span>
      <h2>{mode === "register" ? d.createAccount : d.signIn}</h2>
      {mode === "register" && <label>{d.role}<select value={role} onChange={(event) => setRole(event.target.value)}><option value="YOUTH">{d.youth}</option><option value="PROVIDER">{d.provider}</option></select></label>}
      {mode === "register" && role === "PROVIDER" && <label>{d.organizationName}<input required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
      <label>{d.email}<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>{d.password}<input type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 10 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {mode === "register" && <label>{d.city}<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" disabled={busy} type="submit">{mode === "register" ? d.createAccount : d.signIn} →</button>
      <p className="auth-switch">{mode === "register" ? d.haveAccount : d.noAccount} <Link href={`/${locale}/${mode === "register" ? "login" : "register"}`}>{mode === "register" ? d.signIn : d.createAccount}</Link></p>
    </form></div>
  </main>;
}
