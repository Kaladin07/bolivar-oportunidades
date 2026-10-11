import { dictionary, type Locale } from "@/shared/i18n/i18n";

export function SearchForm({ locale, values = {} }: { locale: Locale; values?: Record<string, string | undefined> }) {
  const d = dictionary(locale);
  return <form action={`/${locale}/opportunities`} className="search-panel">
    <div className="search-grid">
      <label className="search-field search-keyword"><span>{d.search}</span><input name="q" defaultValue={values.q} placeholder={d.searchPlaceholder} /></label>
      <label className="search-field"><span>{d.type}</span><select name="type" defaultValue={values.type || ""}><option value="">{d.allTypes}</option><option value="EMPLOYMENT">{d.employment}</option><option value="INTERNSHIP">{d.internship}</option><option value="COURSE">{d.course}</option><option value="SCHOLARSHIP">{d.scholarship}</option></select></label>
      <label className="search-field"><span>{d.modality}</span><select name="modality" defaultValue={values.modality || ""}><option value="">{d.allModalities}</option><option value="IN_PERSON">{d.inPerson}</option><option value="REMOTE">{d.remote}</option><option value="HYBRID">{d.hybrid}</option></select></label>
      <label className="search-field"><span>{d.location}</span><input name="location" defaultValue={values.location} placeholder={d.locationPlaceholder} /></label>
      <button className="button search-button" type="submit">{d.search} <span aria-hidden>→</span></button>
    </div>
  </form>;
}
