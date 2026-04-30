"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type FormState = {
  name: string;
  address: string;
  city: string;
  notes: string;
};

const initialFormState: FormState = {
  name: "",
  address: "",
  city: "",
  notes: "",
};

export default function NewSitePage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawClientId = params?.id;
  const clientId = Array.isArray(rawClientId) ? rawClientId[0] : rawClientId;
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!clientId) {
      setError("Client ID is missing.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          client_id: clientId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create site");
      }

      router.push(`/clients/${clientId}`);
    } catch {
      setError("Unable to save site. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif", maxWidth: "640px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0 }}>New Site</h1>
        <Link
          href={clientId ? `/clients/${clientId}` : "/clients"}
          style={{ textDecoration: "none", color: "#2563eb", fontSize: "14px" }}
        >
          Back to Client
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "12px", border: "1px solid #e5e7eb", padding: "16px", borderRadius: "8px" }}
      >
        <label style={{ display: "grid", gap: "6px" }}>
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          Address
          <input
            type="text"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            required
            style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          City
          <input
            type="text"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
            required
            style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          Notes
          <textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            rows={4}
            style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", resize: "vertical" }}
          />
        </label>

        {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || !clientId}
          style={{
            backgroundColor: "#111827",
            color: "#fff",
            border: "none",
            padding: "10px 14px",
            borderRadius: "6px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            width: "fit-content",
          }}
        >
          {isSubmitting ? "Saving..." : "Save Site"}
        </button>
      </form>
    </main>
  );
}
