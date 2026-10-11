export type Opportunity = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  modality: string;
  locationPhysical: string | null;
  closingDate: string | null;
  publishedAt: string;
  organizationName: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  summary: string | null;
  employmentType: string | null;
  seniority: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  eligibleLocations: string[];
  provider: {
    id: string;
    displayName: string | null;
    location: string | null;
  };
  categories: { id: string; name: string }[];
  _count?: { applications: number };
};

export type OpportunitySearchResult = {
  items: Opportunity[];
  total: number;
  page: number;
  pages: number;
};
