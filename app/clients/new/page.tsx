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
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif", maxWidth: "640px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0 }}>New Client</h1>
        <Link href="/clients" style={{ textDecoration: "none", color: "#2563eb", fontSize: "14px" }}>
          Back to Clients
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
          Company
          <input
            type="text"
            value={form.company}
            onChange={(event) => setForm({ ...form, company: event.target.value })}
            required
            style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          Phone
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            required
            style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
            style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
          />
        </label>

        {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
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
          {isSubmitting ? "Saving..." : "Save Client"}
        </button>
      </form>
    </main>
  );
}
