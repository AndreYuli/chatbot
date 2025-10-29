export default function RootPage() {
  // This page should never be reached because middleware redirects / to /es-ES/auth/signin
  // But we need it to exist for Next.js routing
  return null;
}