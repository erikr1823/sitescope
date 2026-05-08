import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="page dashboard-page">
      <section className="card" style={{ maxWidth: 460, margin: "4rem auto" }}>
        <SignUp />
      </section>
    </main>
  );
}
