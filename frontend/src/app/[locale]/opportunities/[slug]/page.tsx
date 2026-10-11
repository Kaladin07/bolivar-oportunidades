import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpportunity } from "@/features/opportunities/api/opportunities";
import { ApplyButton } from "@/features/opportunities/components/apply-button";
import { OpportunityDescription } from "@/features/opportunities/components/opportunity-description";
import type { Opportunity } from "@/features/opportunities/model/opportunity";
import { dictionary, isLocale, modalityLabel, typeLabel, type Locale } from "@/shared/i18n/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const opportunity = await getOpportunity(slug);
  return opportunity
    ? { title: opportunity.title, description: (opportunity.summary || opportunity.description).slice(0, 150), alternates: { languages: { es: `/es/opportunities/${slug}`, en: `/en/opportunities/${slug}` } } }
    : { title: locale === "es" ? "Oportunidad" : "Opportunity" };
}

function salaryText(item: Opportunity, locale: Locale) {
  if (item.salaryMin === null && item.salaryMax === null) return null;
  const d = dictionary(locale);
  const number = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", { maximumFractionDigits: 0 });
  const min = item.salaryMin === null ? null : number.format(item.salaryMin);
  const max = item.salaryMax === null ? null : number.format(item.salaryMax);
  const amount = min && max ? `${min}–${max}` : min || max;
  const period = ({ monthly: d.salaryMonthly, annual: d.salaryAnnual, hourly: d.salaryHourly, weekly: d.salaryWeekly, fortnightly: d.salaryFortnightly } as Record<string, string>)[item.salaryPeriod || ""];
  return `${item.salaryCurrency || ""} ${amount}${period ? ` ${period}` : ""}`.trim();
}

function sourceDetailLabel(value: string, locale: Locale) {
  if (locale === "en") return value;
  const translations: Record<string, string> = {
    contractor: "Contratista",
    "full-time": "Tiempo completo",
    "part-time": "Medio tiempo",
    internship: "Prácticas",
    "entry-level": "Nivel inicial",
    junior: "Junior",
    mid: "Intermedio",
    senior: "Senior",
  };
  return translations[value.toLowerCase()] || value;
}

export default async function OpportunityPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const d = dictionary(locale);
  const item = await getOpportunity(slug);
  if (!item) return <main className="container detail-page"><h1>{d.opportunityNotFound}</h1><Link href={`/${locale}/opportunities`}>{d.back}</Link></main>;

  const dateLocale = locale === "es" ? "es-CO" : "en-US";
  const salary = salaryText(item, locale);
  const locations = item.eligibleLocations || [];
  const eligibleText = locations.length === 0 ? d.worldwide : `${locations.slice(0, 5).join(", ")}${locations.length > 5 ? ` +${locations.length - 5}` : ""}`;
  const organization = item.organizationName || item.provider.displayName || d.organization;

  return <main className="detail-page">
    <div className="container">
      <nav className="detail-breadcrumb" aria-label={d.explore}>
        <Link href={`/${locale}/opportunities`}>← {d.explore}</Link><span aria-hidden="true">/</span><span>{typeLabel(item.type, locale)}</span>
      </nav>
      <header className="detail-hero">
        <div className="detail-hero-content">
          <span className="detail-kicker">{d.detailEyebrow}</span>
          <div className="detail-pills"><span className={`type-pill type-${item.type.toLowerCase()}`}>{typeLabel(item.type, locale)}</span><span className="soft-pill">{modalityLabel(item.modality, locale)}</span><span className="detail-origin">{item.sourceUrl ? d.detailExternal : d.detailLocal}</span></div>
          <h1>{item.title}</h1>
          {item.summary && <p className="detail-hero-summary">{item.summary.replace(/:([A-Za-zÀ-ÿ])/g, ": $1")}</p>}
          <div className="detail-hero-meta"><span><small>{d.by}</small><strong>{organization}</strong></span><span className="detail-location">{item.locationPhysical || d.remote}</span></div>
        </div>
      </header>
      <div className="detail-grid">
        <article className="detail-main">
          <div className="detail-section-heading"><div><span className="section-kicker">{d.detailSummary}</span><h2>{d.detailAbout}</h2></div></div>
          <OpportunityDescription text={item.description} />
          {item.categories.length > 0 && <div className="card-tags detail-categories">{item.categories.map((category) => <span key={category.id}>{category.name}</span>)}</div>}
        </article>
        <aside className="detail-sidebar">
          <div className="detail-sidebar-heading"><div><span className="section-kicker">{item.sourceName || d.brand}</span><h2>{d.detailFacts}</h2></div></div>
          {salary && <div className="detail-salary"><span>{d.salaryLabel}</span><strong>{salary}</strong></div>}
          <dl>
            <div><dt>{d.type}</dt><dd>{typeLabel(item.type, locale)}</dd></div>
            <div><dt>{d.modality}</dt><dd>{modalityLabel(item.modality, locale)}</dd></div>
            {item.sourceUrl && <div><dt>{d.eligibleLocationsLabel}</dt><dd>{eligibleText}</dd></div>}
            {item.employmentType && <div><dt>{d.employmentTypeLabel}</dt><dd>{sourceDetailLabel(item.employmentType, locale)}</dd></div>}
            {item.seniority && <div><dt>{d.seniorityLabel}</dt><dd>{sourceDetailLabel(item.seniority, locale)}</dd></div>}
            <div><dt>{d.published}</dt><dd>{new Date(item.publishedAt).toLocaleDateString(dateLocale, { timeZone: "America/Bogota" })}</dd></div>
            {item.closingDate && <div><dt>{d.closes}</dt><dd>{new Date(item.closingDate).toLocaleDateString(dateLocale, { timeZone: "America/Bogota" })}</dd></div>}
            {item.sourceName && <div><dt>{d.source}</dt><dd>{item.sourceName}</dd></div>}
          </dl>
          <div className="detail-apply">
            {item.sourceUrl
              ? <><p>{d.externalNotice}</p><a className="button" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{d.applyAtSource} <span aria-hidden="true">↗</span></a></>
              : <ApplyButton locale={locale} opportunityId={item.id} />}
          </div>
        </aside>
      </div>
    </div>
  </main>;
}
