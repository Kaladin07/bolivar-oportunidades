import type { Opportunity } from "@/features/opportunities/model/opportunity";

export type AccountRole = "YOUTH" | "PROVIDER" | "ADMIN";

export type Account = {
  id: string;
  email: string;
  role: AccountRole;
  location: string | null;
  profile?: {
    bio: string | null;
    skills: string[];
    educationLevel: string | null;
  };
};

export type Application = {
  id: string;
  opportunityId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  appliedAt: string;
  opportunity?: Opportunity;
  youth?: { email: string; location: string | null };
  profileSnapshot?: {
    bio?: string;
    skills?: string[];
    educationLevel?: string;
  };
};

export type OpportunityForm = {
  title: string;
  description: string;
  type: string;
  modality: string;
  locationPhysical: string;
  closingDate: string;
  categories: string;
};

export const emptyOpportunityForm: OpportunityForm = {
  title: "",
  description: "",
  type: "EMPLOYMENT",
  modality: "IN_PERSON",
  locationPhysical: "",
  closingDate: "",
  categories: "",
};
