"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clientRequest } from "@/shared/api/client-request";
import { dictionary, type Locale } from "@/shared/i18n/i18n";
import type { Account } from "../model/dashboard";
import { ProviderDashboard } from "./provider-dashboard";
import { YouthDashboard } from "./youth-dashboard";

export function Dashboard({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientRequest<Account>("auth/me")
      .then(setUser)
      .catch(() => router.push(`/${locale}/login`))
      .finally(() => setLoading(false));
  }, [locale, router]);

  if (loading) {
    return (
      <main className="container dashboard-page">
        <div className="empty-state">...</div>
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="container dashboard-page">
      <div className="page-heading">
        <span className="section-kicker">{d.dashboard.toUpperCase()}</span>
        <h1>{user.role === "PROVIDER" ? d.providerTitle : d.profileTitle}</h1>
        <p>{user.role === "PROVIDER" ? d.providerText : d.profileText}</p>
      </div>
      {user.role === "YOUTH" && <YouthDashboard locale={locale} user={user} />}
      {user.role === "PROVIDER" && <ProviderDashboard locale={locale} />}
      {user.role === "ADMIN" && <p>{d.providerOnly}</p>}
    </main>
  );
}
