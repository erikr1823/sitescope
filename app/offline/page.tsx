import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="page dashboard-page">
      <section className="card" style={{ maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
        <p className="site-section-kicker">Offline</p>
        <h1 className="page__title">You are offline</h1>
        <p className="site-section-lead">
          SiteScope shell is available, but live data needs a network connection. Reconnect and
          refresh to continue.
        </p>
        <div className="form-actions" style={{ justifyContent: "center" }}>
          <Link href="/" className="btn">
            Try dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
