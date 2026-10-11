import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/shared/layout/site-header";
import { dictionary, isLocale, locales } from "@/shared/i18n/i18n";
import "../globals.css";
import "../visual-refresh.css";

export function generateStaticParams() { return locales.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = dictionary(locale);
  return { title: d.brand, description: d.heroText, icons: { icon: "/icon.svg" }, alternates: { languages: { es: "/es", en: "/en" } } };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary(locale);
  return <html lang={locale}><body><SiteHeader locale={locale} />{children}<footer className="site-footer"><div className="container footer-inner"><div><div className="footer-brand"><Image src="/logo-mark.svg" width={38} height={38} alt="" /><span><strong>Bolívar</strong><small>Oportunidades</small></span></div><p>{d.footerText}</p></div><nav className="footer-nav" aria-label={d.brand}><Link href={`/${locale}/opportunities`}>{d.explore}</Link><Link href={`/${locale}/login`}>{d.login}</Link><Link href={locale === "es" ? "/en" : "/es"}>{locale === "es" ? "English" : "Español"}</Link></nav><span className="footer-copy">© {new Date().getFullYear()} {d.brand}</span></div></footer></body></html>;
}
