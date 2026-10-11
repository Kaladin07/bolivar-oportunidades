"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientRequest } from "@/shared/api/client-request";
import { dictionary, type Locale } from "@/shared/i18n/i18n";

export function ApplyButton({ locale, opportunityId }: { locale: Locale; opportunityId: string }) {
  const d = dictionary(locale);
  const [role, setRole] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");
  useEffect(() => {
    clientRequest<{ role: string }>("auth/me").then((user) => setRole(user.role)).catch(() => setRole("guest"));
    clientRequest<{ opportunityId: string }[]>("applications/mine").then((items) => {
      if (items.some((item) => item.opportunityId === opportunityId)) setStatus("done");
    }).catch(() => undefined);
  }, [opportunityId]);

  async function apply() {
    setStatus("sending"); setError("");
    try { await clientRequest(`applications/${opportunityId}`, { method: "POST" }); setStatus("done"); }
    catch (caught) { setStatus("idle"); setError(caught instanceof Error && caught.message.includes("profile") ? d.completeProfile : d.errorGeneric); }
  }

  if (role === "PROVIDER" || role === "ADMIN") return <p className="muted">{d.youthOnly}</p>;
  if (role !== "YOUTH") return <Link className="button" href={`/${locale}/login`}>{d.signInToApply} ↗</Link>;
  return <div><button className="button" disabled={status !== "idle"} onClick={apply}>{status === "done" ? d.applied : status === "sending" ? d.applying : d.apply} ↗</button>{error && <p className="form-error">{error} <Link href={`/${locale}/dashboard`}>{d.profileTitle}</Link></p>}</div>;
}
