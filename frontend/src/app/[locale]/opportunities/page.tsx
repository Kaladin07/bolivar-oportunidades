import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpportunities } from "@/features/opportunities/api/opportunities";
import { OpportunityCard } from "@/features/opportunities/components/opportunity-card";
import { SearchForm } from "@/features/opportunities/components/search-form";
import { dictionary, isLocale, modalityLabel, typeLabel } from "@/shared/i18n/i18n";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const d = dictionary(locale);
  const result = await getOpportunities(query);
  const hrefWith = (changes: Record<string, string | undefined>) => {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, ...changes })) {
      if (value && key !== "page") values.set(key, value);
    }
    if (changes.page) values.set("page", changes.page);
    const suffix = values.toString();
    return `/${locale}/opportunities${suffix ? `?${suffix}` : ""}`;
  };
  const activeFilters = [
    query.q ? { key: "q", label: query.q } : null,
    query.type ? { key: "type", label: typeLabel(query.type, locale) } : null,
    query.modality ? { key: "modality", label: modalityLabel(query.modality, locale) } : null,
    query.location ? { key: "location", label: query.location } : null,
    query.sort === "closing" ? { key: "sort", label: d.closingFirst } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));
  const visiblePages = result && result.pages > 1
    ? Array.from(
        { length: Math.min(5, result.pages) },
        (_, index) => Math.max(1, Math.min(result.page - 2, result.pages - 4)) + index,
      )
    : [];

  return <main className="listing-page"><div className="container">
    <div className="page-heading"><span className="section-kicker">{d.eyebrow}</span><h1>{d.explore}</h1><p>{d.searchHint}</p></div>
    <SearchForm locale={locale} values={query} />
    {activeFilters.length > 0 && <div className="active-filters" aria-label={d.activeFilters}><span>{d.activeFilters}</span>{activeFilters.map((filter) => <Link key={filter.key} href={hrefWith({ [filter.key]: undefined })} aria-label={`${d.removeFilter}: ${filter.label}`}>{filter.label}<span aria-hidden>×</span></Link>)}</div>}
    <div className="results-heading"><strong>{result?.total ?? 0} {d.results}</strong>{activeFilters.length > 0 && <Link href={`/${locale}/opportunities`}>{d.clear}</Link>}</div>
    {result ? result.items.length ? <>
      <div className="card-grid">{result.items.map((item) => <OpportunityCard key={item.id} opportunity={item} locale={locale} />)}</div>
      {result.pages > 1 && <nav className="pagination" aria-label={d.results}>
        {result.page > 1 && <Link className="pagination-step" href={hrefWith({ page: String(result.page - 1) })}>← {d.previous}</Link>}
        <span className="pagination-pages">{visiblePages.map((page) => <Link key={page} className={result.page === page ? "active" : ""} aria-current={result.page === page ? "page" : undefined} href={hrefWith({ page: String(page) })}>{page}</Link>)}</span>
        {result.page < result.pages && <Link className="pagination-step" href={hrefWith({ page: String(result.page + 1) })}>{d.next} →</Link>}
      </nav>}
    </> : <div className="empty-state"><h2>{d.noResults}</h2><p>{d.noResultsHint}</p></div> : <div className="empty-state">{d.unavailable}</div>}
  </div></main>;
}
