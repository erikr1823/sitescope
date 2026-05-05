"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Client = {
  id: number;
  name: string;
};

type Site = {
  id: number;
  name: string;
  address: string;
  city: string;
};

export default function ClientSitesPage() {
  const params = useParams<{ id?: string | string[] }>();
  const rawClientId = params?.id;
  const clientId = Array.isArray(rawClientId) ? rawClientId[0] : rawClientId;
  const [clientName, setClientName] = useState("Client");
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!clientId) {
        setError("Client ID is missing.");
        setIsLoading(false);
        return;
      }

      try {
        const [clientsResponse, sitesResponse] = await Promise.all([
          fetch("/api/clients"),
          fetch(`/api/sites?client_id=${encodeURIComponent(clientId)}`),
        ]);

        if (!clientsResponse.ok || !sitesResponse.ok) {
          throw new Error("Failed to load data");
        }

        const clients = (await clientsResponse.json()) as Client[];
        const sitesData = (await sitesResponse.json()) as Site[];

        const currentClient = clients.find((client) => String(client.id) === clientId);
        setClientName(currentClient?.name ?? "Client");
        setSites(sitesData);
      } catch {
        setError("Unable to load client sites right now.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [clientId]);

  return (
    <main className="page dashboard-page">
      <header className="dashboard-hero">
        <div className="dashboard-hero__row">
          <div>
            <h1 className="page__title">{clientName} — Sites</h1>
            <p className="page__subtle">
              Site inventory and quick asset access for this client.
            </p>
            <p className="dashboard-hero__hint">
              Each site can hold its own asset register. Add a site for a new location, then open
              assets from the site card.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            {clientId ? (
              <Link href={`/clients/${clientId}/sites/new`} className="btn">
                New site
              </Link>
            ) : null}
            <Link href="/clients" className="btn--ghost">
              All clients
            </Link>
          </div>
        </div>
      </header>

      {isLoading ? (
        <section className="card" aria-live="polite">
          <p className="status">Loading sites…</p>
        </section>
      ) : error ? (
        <section className="card">
          <p className="error">{error}</p>
        </section>
      ) : sites.length === 0 ? (
        <section className="card" aria-labelledby="client-sites-empty-title">
          <header className="form-card__head">
            <p className="site-section-kicker">Sites</p>
            <h2 id="client-sites-empty-title" className="site-section-title">
              No sites yet
            </h2>
            <p className="site-section-lead">
              Create a site to represent a location or facility for this client, then attach assets
              from the site view.
            </p>
          </header>
          {clientId ? (
            <Link href={`/clients/${clientId}/sites/new`} className="btn inline-flex max-md:w-full max-md:justify-center">
              Add first site
            </Link>
          ) : null}
        </section>
      ) : (
        <section aria-labelledby="client-sites-list-title">
          <header className="form-card__head">
            <p className="site-section-kicker">Locations</p>
            <h2 id="client-sites-list-title" className="site-section-title">
              Sites for {clientName}
            </h2>
            <p className="site-section-lead">
              {sites.length} site{sites.length === 1 ? "" : "s"} — open assets or manage inventory
              from each card.
            </p>
          </header>

          <div className="site-list">
            {sites.map((site) => (
              <article key={site.id} className="card site-card">
                <div className="min-w-0 flex-1">
                  <h3 className="site-card__title">{site.name}</h3>
                  <p className="site-card__meta">{site.address}</p>
                  <p className="site-card__meta">{site.city}</p>
                </div>

                <Link
                  href={`/sites/${site.id}/assets`}
                  className="btn-secondary shrink-0"
                >
                  View assets
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
