"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clientRequest } from "@/shared/api/client-request";
import { dictionary, type Locale } from "@/shared/i18n/i18n";

type User = { id: string; role: "YOUTH" | "PROVIDER" | "ADMIN" };

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => { clientRequest<User>("auth/me").then(setUser).catch(() => setUser(null)); }, [pathname]);
  const otherLocale = locale === "es" ? "en" : "es";
  const otherPath = pathname.replace(/^\/(es|en)/, `/${otherLocale}`);

  async function logout() {
    await clientRequest("auth/logout", { method: "POST" });
    setUser(null);
    router.push(`/${locale}`);
    router.refresh();
  }

  return <header className="site-header">
    <div className="container header-inner">
      <Link className="brand" href={`/${locale}`} aria-label={d.home}><Image className="brand-icon" src="/logo-mark.svg" width={38} height={38} alt="" priority /><span className="brand-name"><strong>Bolívar</strong><small>Oportunidades</small></span></Link>
      <nav className="main-nav" aria-label={d.brand}>
        <Link className={pathname.includes("/opportunities") ? "nav-active" : ""} href={`/${locale}/opportunities`}>{d.explore}</Link>
        {user && <Link className={pathname.includes("/dashboard") ? "nav-active" : ""} href={`/${locale}/dashboard`}>{d.dashboard}</Link>}
      </nav>
      <div className="header-actions">
        <Link className="language-switch" href={otherPath} hrefLang={otherLocale} onClick={(event) => { event.preventDefault(); router.push(otherPath + window.location.search); }} aria-label={otherLocale === "en" ? "Switch to English" : "Cambiar a español"}>{otherLocale.toUpperCase()}</Link>
        {user ? <button className="text-button" onClick={logout}>{d.logout}</button> : <><Link className="text-button login-link" href={`/${locale}/login`}>{d.login}</Link><Link className="button button-small" href={`/${locale}/register`}>{d.register}</Link></>}
      </div>
    </div>
  </header>;
}
