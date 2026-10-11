import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpportunities } from "@/features/opportunities/api/opportunities";
import { OpportunityCard } from "@/features/opportunities/components/opportunity-card";
import { SearchForm } from "@/features/opportunities/components/search-form";
import { dictionary, isLocale } from "@/shared/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const d = dictionary(locale);
  const result = await getOpportunities(query);
  const pageHref = (page: number) => { const values = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value && key !== "page") values.set(key, value); values.set("page", String(page)); return `/${locale}/opportunities?${values}`; };
  return <main className="listing-page"><div className="container"><div className="page-heading"><span className="section-kicker">{d.eyebrow}</span><h1>{d.explore}</h1><p>{d.searchHint}</p></div><SearchForm locale={locale} values={query} /><div className="results-heading"><strong>{result?.total ?? 0} {d.results}</strong><Link href={`/${locale}/opportunities`}>{d.clear}</Link></div>{result ? result.items.length ? <><div className="card-grid">{result.items.map((item) => <OpportunityCard key={item.id} opportunity={item} locale={locale} />)}</div>{result.pages > 1 && <nav className="pagination" aria-label={d.results}>{Array.from({ length: result.pages }, (_, index) => <Link key={index} className={result.page === index + 1 ? "active" : ""} href={pageHref(index + 1)}>{index + 1}</Link>)}</nav>}</> : <div className="empty-state"><h2>{d.noResults}</h2><p>{d.noResultsHint}</p></div> : <div className="empty-state">{d.unavailable}</div>}</div></main>;
}
