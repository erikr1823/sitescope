import Link from "next/link";

const summaryCards = [
  {
    title: "Clients",
    description: "Manage customer profiles, contacts, and account ownership.",
    value: "Directory",
  },
  {
    title: "Sites",
    description: "Track active locations, operational details, and coverage.",
    value: "Locations",
  },
  {
    title: "Assets",
    description: "Review hardware inventory, lifecycle state, and deployment.",
    value: "Inventory",
  },
];

export default function DashboardHomePage() {
  return (
    <main className="page">
      <section className="page__header">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtle">Welcome to SiteScope IT asset management.</p>
        </div>
        <Link href="/clients" className="btn">
          Open Clients
        </Link>
      </section>

      <section className="dashboard-grid" aria-label="Summary cards">
        {summaryCards.map((card) => (
          <article key={card.title} className="card dashboard-card">
            <p className="dashboard-card__label">{card.title}</p>
            <h2 className="dashboard-card__value">{card.value}</h2>
            <p className="dashboard-card__description">{card.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
