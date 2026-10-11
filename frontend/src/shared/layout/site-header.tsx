"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { dictionary, type Locale } from "@/shared/i18n/i18n";

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const pathname = usePathname();
  const router = useRouter();
  const otherLocale = locale === "es" ? "en" : "es";
  const otherPath = pathname.replace(/^\/(es|en)/, `/${otherLocale}`);

  return <header className="site-header">
    <div className="container header-inner">
      <Link className="brand" href={`/${locale}`} aria-label={d.home}><Image className="brand-icon" src="/logo-mark.svg" width={38} height={38} alt="" priority /><span className="brand-name"><strong>Bolívar</strong><small>Oportunidades</small></span></Link>
      <nav className="main-nav" aria-label={d.brand}>
        <Link className={pathname === `/${locale}` ? "nav-active" : ""} href={`/${locale}`}>{d.home}</Link>
        <Link className={pathname.includes("/opportunities") ? "nav-active" : ""} href={`/${locale}/opportunities`}>{d.explore}</Link>
      </nav>
      <div className="header-actions">
        <Link className="language-switch" href={otherPath} hrefLang={otherLocale} onClick={(event) => { event.preventDefault(); router.push(otherPath + window.location.search); }} aria-label={otherLocale === "en" ? "Switch to English" : "Cambiar a español"}>{otherLocale.toUpperCase()}</Link>
      </div>
    </div>
  </header>;
}
