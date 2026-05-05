"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  company: string;
  phone: string;
  email: string;
};

const initialFormState: FormState = {
  name: "",
  company: "",
  phone: "",
  email: "",
};

export default function NewClientPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to create client");
      }

      router.push("/clients");
    } catch {
      setError("Unable to save client. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page dashboard-page form-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">New client</h1>
            <p className="page__subtle">
              Create an organization record — you can add sites and assets after saving.
            </p>
            <p className="dashboard-hero__hint">
              Required fields mirror what your team needs for day‑to‑day operations: identity,
              company, phone, and email.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <Link href="/clients" className="btn--ghost">
              Back to clients
            </Link>
          </div>
        </div>
      </header>

      <section className="card" aria-labelledby="new-client-form-title">
        <header className="form-card__head">
          <p className="site-section-kicker">Client record</p>
          <h2 id="new-client-form-title" className="site-section-title">
            Contact details
          </h2>
          <p className="site-section-lead">
            Information is stored with the client and used across sites and asset views.
          </p>
        </header>

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="client-name">
              Name
            </label>
            <input
              id="client-name"
              className="form-input"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="client-company">
              Company
            </label>
            <input
              id="client-company"
              className="form-input"
              type="text"
              autoComplete="organization"
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="client-phone">
              Phone
            </label>
            <input
              id="client-phone"
              className="form-input"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="client-email">
              Email
            </label>
            <input
              id="client-email"
              className="form-input"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
            />
          </div>

          {error ? <p className="error">{error}</p> : null}

          <div className="form-actions">
            <button
              type="submit"
              className="btn disabled:cursor-not-allowed disabled:opacity-75"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Save client"}
            </button>
            <Link href="/clients" className="btn--ghost">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
