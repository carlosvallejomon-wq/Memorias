import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
        background:
          "radial-gradient(circle at 15% 15%, #fff7ed 0, transparent 34%), linear-gradient(145deg, #fffaf5 0%, #f7efe7 100%)",
      }}
    >
      <SignUp />
    </main>
  );
}
