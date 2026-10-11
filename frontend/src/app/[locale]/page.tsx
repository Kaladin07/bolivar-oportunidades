import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getOpportunities } from "@/features/opportunities/api/opportunities";
import { OpportunityCard } from "@/features/opportunities/components/opportunity-card";
import { SearchForm } from "@/features/opportunities/components/search-form";
import { dictionary, isLocale } from "@/shared/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary(locale);
  const result = await getOpportunities({});
  return <main>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-route" aria-hidden></span>{d.eyebrow}</div><h1>{d.heroTitle}</h1><p>{d.heroText}</p><div className="hero-actions"><Link className="button" href={`/${locale}/opportunities`}>{d.browse} <span aria-hidden>→</span></Link><Link className="button-outline" href={`/${locale}/register?role=PROVIDER`}>{d.join}</Link></div><div className="hero-proof" aria-label={locale === "es" ? "Resumen de oportunidades" : "Opportunity summary"}><span><strong>{result?.total ?? "—"}</strong>{d.results}</span><span><strong>4</strong>{locale === "es" ? "Tipos de oportunidad" : "Opportunity types"}</span><span><strong>2</strong>{locale === "es" ? "Idiomas" : "Languages"}</span></div></div><figure className="hero-media"><div className="hero-photo-frame"><Image src="/images/cartagena-street.jpg" width={900} height={900} alt={locale === "es" ? "Calle de Cartagena, Bolívar, con personas caminando" : "Street in Cartagena, Bolívar, with people walking"} priority /><span className="photo-route" aria-hidden></span></div><figcaption><span>Cartagena, Bolívar</span><a href="https://unsplash.com/photos/a-group-of-people-walking-down-a-street-next-to-tall-buildings-Nq6oWEHHFck" target="_blank" rel="noopener noreferrer">Karelia Blum / Unsplash ↗</a></figcaption></figure></div></section>
    <section className="container search-section"><div className="section-heading"><div><span className="section-kicker">01 / {d.explore.toUpperCase()}</span><h2>{d.searchTitle}</h2><p>{d.searchHint}</p></div></div><SearchForm locale={locale} /></section>
    <section className="container latest-section"><div className="section-heading heading-row"><div><span className="section-kicker">02 / {d.latest.toUpperCase()}</span><h2>{d.latest}</h2><p>{d.latestText}</p></div><Link className="section-link" href={`/${locale}/opportunities`}>{d.viewAll} ↗</Link></div>{result ? result.items.length ? <div className="card-grid">{result.items.slice(0, 6).map((item) => <OpportunityCard key={item.id} opportunity={item} locale={locale} />)}</div> : <div className="empty-state">{d.noResults}</div> : <div className="empty-state">{d.unavailable}</div>}</section>
    <section className="how-section"><div className="container"><div className="section-heading"><span className="section-kicker">03 / {d.howTitle.toUpperCase()}</span><h2>{d.howTitle}</h2><p>{d.howText}</p></div><div className="steps-grid"><div className="step"><span>01</span><h3>{d.howOne}</h3><p>{d.howOneText}</p></div><div className="step"><span>02</span><h3>{d.howTwo}</h3><p>{d.howTwoText}</p></div><div className="step"><span>03</span><h3>{d.howThree}</h3><p>{d.howThreeText}</p></div></div></div></section>
    <section className="container callout"><div><span className="section-kicker">{d.join.toUpperCase()}</span><h2>{d.calloutTitle}</h2><p>{d.calloutText}</p></div><Link className="button button-light" href={`/${locale}/register?role=PROVIDER`}>{d.calloutButton} ↗</Link></section>
  </main>;
}
