"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { clientRequest } from "@/shared/api/client-request";
import { dictionary, type Locale } from "@/shared/i18n/i18n";
import type { Account, Application } from "../model/dashboard";

export function YouthDashboard({
  locale,
  user,
}: {
  locale: Locale;
  user: Account;
}) {
  const d = dictionary(locale);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bio, setBio] = useState(user.profile?.bio ?? "");
  const [skills, setSkills] = useState(user.profile?.skills.join(", ") ?? "");
  const [educationLevel, setEducationLevel] = useState(
    user.profile?.educationLevel ?? "",
  );
  const [location, setLocation] = useState(user.location ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void clientRequest<Application[]>("applications/mine").then(
      setApplications,
    );
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await clientRequest("auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          bio,
          skills: skills
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          educationLevel,
          location,
        }),
      });
      setMessage(d.saved);
    } catch {
      setMessage(d.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      <div className="dashboard-columns">
        <section className="dashboard-panel">
          <h2>{d.profileTitle}</h2>
          <form className="stacked-form" onSubmit={saveProfile}>
            <label>
              {d.bio}
              <textarea
                rows={5}
                value={bio}
                placeholder={d.bioPlaceholder}
                onChange={(event) => setBio(event.target.value)}
              />
            </label>
            <label>
              {d.skills}
              <input
                value={skills}
                placeholder={d.skillsPlaceholder}
                onChange={(event) => setSkills(event.target.value)}
              />
            </label>
            <label>
              {d.education}
              <input
                value={educationLevel}
                onChange={(event) => setEducationLevel(event.target.value)}
              />
            </label>
            <label>
              {d.city}
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <button className="button" disabled={busy} type="submit">
              {d.save}
            </button>
          </form>
        </section>
        <section className="dashboard-panel">
          <h2>{d.myApplications}</h2>
          {applications.length ? (
            <div className="dashboard-list">
              {applications.map((application) => (
                <div className="dashboard-list-item" key={application.id}>
                  <div>
                    <h3>
                      <Link
                        href={`/${locale}/opportunities/${application.opportunity?.slug}`}
                      >
                        {application.opportunity?.title}
                      </Link>
                    </h3>
                    <span>
                      {new Date(application.appliedAt).toLocaleDateString(
                        locale === "es" ? "es-CO" : "en-US",
                      )}
                    </span>
                  </div>
                  <span
                    className={`status status-${application.status.toLowerCase()}`}
                  >
                    {application.status === "PENDING"
                      ? d.pending
                      : application.status === "ACCEPTED"
                        ? d.accepted
                        : d.rejected}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{d.noApplications}</p>
          )}
        </section>
      </div>
    </>
  );
}
