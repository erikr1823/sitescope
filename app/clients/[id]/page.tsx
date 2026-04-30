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
    <main className="page">
      <div className="page__header">
        <div>
          <h1 className="page__title">{clientName} Sites</h1>
          <p className="page__subtle">Site inventory and quick asset access for this client.</p>
        </div>
        {clientId ? (
          <Link href={`/clients/${clientId}/sites/new`} className="btn">
            New Site
          </Link>
        ) : null}
      </div>

      {isLoading ? (
        <p className="status">Loading sites...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : sites.length === 0 ? (
        <section className="card">
          <p className="status">No sites found for this client.</p>
        </section>
      ) : (
        <div className="site-list">
          {sites.map((site) => (
            <article key={site.id} className="card site-card">
              <div>
                <h2 className="site-card__title">{site.name}</h2>
                <p className="site-card__meta">{site.address}</p>
                <p className="site-card__meta">{site.city}</p>
              </div>

              <Link href={`/sites/${site.id}/assets`} className="btn-secondary">
                View Assets
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
