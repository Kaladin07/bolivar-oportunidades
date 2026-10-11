"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { Opportunity } from "@/features/opportunities/model/opportunity";
import { clientRequest } from "@/shared/api/client-request";
import {
  dictionary,
  modalityLabel,
  typeLabel,
  type Locale,
} from "@/shared/i18n/i18n";
import {
  emptyOpportunityForm,
  type Application,
  type OpportunityForm,
} from "../model/dashboard";

export function ProviderDashboard({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(
    null,
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OpportunityForm>(emptyOpportunityForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshOpportunities() {
    setOpportunities(await clientRequest<Opportunity[]>("opportunities/mine"));
  }

  useEffect(() => {
    void clientRequest<Opportunity[]>("opportunities/mine").then(
      setOpportunities,
    );
  }, []);

  function editOpportunity(item?: Opportunity) {
    setMessage("");
    setEditing(item?.id ?? null);
    setForm(
      item
        ? {
            title: item.title,
            description: item.description,
            type: item.type,
            modality: item.modality,
            locationPhysical: item.locationPhysical ?? "",
            closingDate: item.closingDate?.slice(0, 10) ?? "",
            categories: item.categories
              .map((category) => category.name)
              .join(", "),
          }
        : emptyOpportunityForm,
    );
    setShowForm(true);
  }

  async function saveOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = {
      ...form,
      closingDate: form.closingDate
        ? new Date(`${form.closingDate}T23:59:59`).toISOString()
        : undefined,
      locationPhysical:
        form.modality === "REMOTE" ? undefined : form.locationPhysical,
      categories: form.categories
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    };
    try {
      await clientRequest(
        editing ? `opportunities/${editing}` : "opportunities",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      await refreshOpportunities();
      setShowForm(false);
      setEditing(null);
      router.refresh();
    } catch {
      setMessage(d.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function removeOpportunity(id: string) {
    if (!window.confirm(d.deleteConfirm)) return;
    try {
      await clientRequest(`opportunities/${id}`, { method: "DELETE" });
      await refreshOpportunities();
      router.refresh();
    } catch {
      setMessage(d.errorGeneric);
    }
  }

  async function reviewApplications(id: string) {
    setSelectedOpportunity(id);
    setApplications(
      await clientRequest<Application[]>(`applications/opportunity/${id}`),
    );
  }

  async function updateStatus(id: string, status: string) {
    try {
      await clientRequest(`applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (selectedOpportunity) await reviewApplications(selectedOpportunity);
    } catch {
      setMessage(d.errorGeneric);
    }
  }

  return (
    <div className="provider-dashboard">
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      <div className="dashboard-toolbar">
        <h2>{d.myOpportunities}</h2>
        <button className="button" onClick={() => editOpportunity()}>
          {d.newOpportunity} +
        </button>
      </div>
      {showForm && (
        <form
          className="dashboard-panel opportunity-form stacked-form"
          onSubmit={saveOpportunity}
        >
          <h2>{editing ? d.edit : d.newOpportunity}</h2>
          <label>
            {d.title}
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </label>
          <label>
            {d.description}
            <textarea
              required
              rows={6}
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </label>
          <div className="form-row">
            <label>
              {d.type}
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value })
                }
              >
                <option value="EMPLOYMENT">{d.employment}</option>
                <option value="INTERNSHIP">{d.internship}</option>
                <option value="COURSE">{d.course}</option>
                <option value="SCHOLARSHIP">{d.scholarship}</option>
              </select>
            </label>
            <label>
              {d.modality}
              <select
                value={form.modality}
                onChange={(event) =>
                  setForm({ ...form, modality: event.target.value })
                }
              >
                <option value="IN_PERSON">{d.inPerson}</option>
                <option value="REMOTE">{d.remote}</option>
                <option value="HYBRID">{d.hybrid}</option>
              </select>
            </label>
          </div>
          {form.modality !== "REMOTE" && (
            <label>
              {d.physicalLocation}
              <input
                required
                value={form.locationPhysical}
                onChange={(event) =>
                  setForm({ ...form, locationPhysical: event.target.value })
                }
              />
            </label>
          )}
          <div className="form-row">
            <label>
              {d.closingDate}
              <input
                type="date"
                value={form.closingDate}
                onChange={(event) =>
                  setForm({ ...form, closingDate: event.target.value })
                }
              />
            </label>
            <label>
              {d.categories}
              <input
                value={form.categories}
                onChange={(event) =>
                  setForm({ ...form, categories: event.target.value })
                }
              />
            </label>
          </div>
          <div className="form-actions">
            <button className="button" disabled={busy} type="submit">
              {editing ? d.update : d.publish}
            </button>
            <button
              className="button-outline"
              type="button"
              onClick={() => setShowForm(false)}
            >
              {d.cancel}
            </button>
          </div>
        </form>
      )}
      {opportunities.length ? (
        <div className="dashboard-list">
          {opportunities.map((item) => (
            <article className="provider-item" key={item.id}>
              <div>
                <span className="type-pill">
                  {typeLabel(item.type, locale)}
                </span>
                <h3>
                  <Link href={`/${locale}/opportunities/${item.slug}`}>
                    {item.title}
                  </Link>
                </h3>
                <p>
                  {modalityLabel(item.modality, locale)} ·{" "}
                  {item.locationPhysical || d.remote} ·{" "}
                  {item._count?.applications ?? 0} {d.applicants}
                </p>
              </div>
              <div className="item-actions">
                <button onClick={() => reviewApplications(item.id)}>
                  {d.review}
                </button>
                <button onClick={() => editOpportunity(item)}>{d.edit}</button>
                <button onClick={() => removeOpportunity(item.id)}>
                  {d.delete}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">{d.noOpportunities}</div>
      )}
      {selectedOpportunity && (
        <section className="dashboard-panel application-panel">
          <div className="dashboard-toolbar">
            <h2>{d.applicants}</h2>
            <button
              className="text-button"
              onClick={() => setSelectedOpportunity(null)}
            >
              ×
            </button>
          </div>
          {applications.length ? (
            <div className="dashboard-list">
              {applications.map((application) => (
                <div className="applicant-item" key={application.id}>
                  <div>
                    <strong>{application.youth?.email}</strong>
                    <p>{application.profileSnapshot?.bio}</p>
                    <small>
                      {application.profileSnapshot?.skills?.join(", ")}
                    </small>
                    <span>
                      {d.appliedAt}:{" "}
                      {new Date(application.appliedAt).toLocaleDateString(
                        locale === "es" ? "es-CO" : "en-US",
                      )}
                    </span>
                  </div>
                  <select
                    aria-label={d.selectStatus}
                    value={application.status}
                    onChange={(event) =>
                      updateStatus(application.id, event.target.value)
                    }
                  >
                    <option value="PENDING">{d.pending}</option>
                    <option value="ACCEPTED">{d.accepted}</option>
                    <option value="REJECTED">{d.rejected}</option>
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <p>{d.noApplicants}</p>
          )}
        </section>
      )}
    </div>
  );
}
