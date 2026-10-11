import type {
  Opportunity,
  OpportunitySearchResult,
} from "../model/opportunity";
import { getApiInternalUrl } from "@/shared/config/server-env";

export async function getOpportunities(
  query: Record<string, string | undefined>,
): Promise<OpportunitySearchResult | null> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }

  try {
    const apiUrl = getApiInternalUrl();
    const response = await fetch(`${apiUrl}/api/opportunities?${params}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getOpportunity(
  slug: string,
): Promise<Opportunity | null> {
  try {
    const apiUrl = getApiInternalUrl();
    const response = await fetch(
      `${apiUrl}/api/opportunities/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}
