import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";

export default function SignInLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      localization={esES}
      proxyUrl="/__clerk"
      signInUrl="/sign-in"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      signUpUrl="/sign-up"
    >
      {children}
    </ClerkProvider>
  );
}