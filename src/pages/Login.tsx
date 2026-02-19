import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { Dna, Shield, BarChart3, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const features = [
  {
    icon: Dna,
    title: "Genomic Analysis",
    description: "Parse VCF and genetic data to identify pharmacogenomic variants across key metabolic genes.",
  },
  {
    icon: Shield,
    title: "CPIC Guidelines",
    description: "Deterministic clinical recommendations based on peer-reviewed CPIC therapeutic guidelines.",
  },
  {
    icon: BarChart3,
    title: "Risk Assessment",
    description: "Comprehensive drug-gene interaction risk scoring with confidence intervals and evidence levels.",
  },
];

const Login = () => {
  const { user, setUserFromCredential, isInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  useEffect(() => {
    if (!isInitialized) return;
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, isInitialized, navigate, from]);

  if (!clientId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="clinical-card fade-in-up w-full max-w-md p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Google sign-in is not configured. Set{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">VITE_GOOGLE_CLIENT_ID</code> in
            your <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env</code> file.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Create a project in Google Cloud Console, enable the Google+ API, and create an OAuth 2.0
            Client ID (Web application). Add{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">http://localhost:8080</code> to
            authorized JavaScript origins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Subtle gradient from top-left (reference style) */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background: "radial-gradient(ellipse 80% 50% at 0% 0%, hsl(var(--primary) / 0.06) 0%, transparent 50%)",
        }}
      />

      {/* Top-left branding */}
      <header className="relative z-10 flex items-center gap-2 px-6 py-5 sm:px-8">
        <img
          src="/logo.png"
          alt="GeneX"
          className="h-9 w-9 object-contain"
        />
        <span className="text-lg font-semibold tracking-tight">
          <span className="text-gene-red">Gene</span><span className="text-primary">X</span>
        </span>
      </header>

      {/* Central content */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-4 sm:px-6">
        <div className="fade-in-up mx-auto w-full max-w-2xl text-center">
          {/* Tagline */}
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Pharmacogenomic Decision Support
          </p>

          {/* Main heading */}
          <h1 className="mb-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            <span className="text-gene-red">Precision Drug Safety</span>
            {" "}
            <span className="text-primary">Through Genomics</span>
          </h1>

          {/* Description */}
          <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            AI-assisted pharmacogenomic clinical decision support powered by deterministic CPIC guidelines.
          </p>

          {/* Sign in with Google — prominent button style */}
          <div className="mb-16 flex flex-col items-center gap-3">
            <div className="flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl shadow-sm [&_iframe]:!min-h-[48px] [&_iframe]:!rounded-xl">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  const token = credentialResponse.credential;
                  if (token) setUserFromCredential(token);
                }}
                onError={() => {
                  console.error("Google login failed");
                }}
                useOneTap={false}
                theme="filled_blue"
                size="large"
                text="continue_with"
                shape="rectangular"
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Sign in to continue</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </div>

          {/* Feature cards — reference-style white cards with icon, title, description */}
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="fade-in-up rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-md"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} GeneX. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Login;
