import Link from "next/link";
import type { Opportunity } from "@/features/opportunities/model/opportunity";
import { dictionary, modalityLabel, typeLabel, type Locale } from "@/shared/i18n/i18n";

export function OpportunityCard({ opportunity, locale }: { opportunity: Opportunity; locale: Locale }) {
  const d = dictionary(locale);
  return <article className={`opportunity-card opportunity-${opportunity.type.toLowerCase()}`}>
    <div className="card-top"><span className={`type-pill type-${opportunity.type.toLowerCase()}`}>{typeLabel(opportunity.type, locale)}</span><span className="card-date">{new Date(opportunity.publishedAt).toLocaleDateString(locale === "es" ? "es-CO" : "en-US", { month: "short", day: "numeric" })}</span></div>
    <h3><Link href={`/${locale}/opportunities/${opportunity.slug}`}>{opportunity.title}</Link></h3>
    <p className="card-description">{opportunity.summary || opportunity.description}</p>
    <div className="card-tags"><span>{modalityLabel(opportunity.modality, locale)}</span><span>{opportunity.locationPhysical || d.remote}</span></div>
    <div className="card-bottom"><span className="provider-name">{opportunity.organizationName || opportunity.provider.displayName || d.organization}{opportunity.sourceName && <small>{d.source}: {opportunity.sourceName}</small>}</span><Link className="card-link" href={`/${locale}/opportunities/${opportunity.slug}`} aria-label={`${d.viewDetails}: ${opportunity.title}`}><span>{d.viewDetails}</span><span className="card-link-arrow" aria-hidden>→</span></Link></div>
  </article>;
}
