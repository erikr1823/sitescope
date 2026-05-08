import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="page dashboard-page">
      <section className="card" style={{ maxWidth: 460, margin: "4rem auto" }}>
        <SignIn />
      </section>
    </main>
  );
}
