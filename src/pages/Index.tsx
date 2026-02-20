import { Link } from "react-router-dom";

import { ArrowRight, Shield, Dna, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";

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

const Index = () => {
  return (
    <DashboardLayout>
      <PageContainer>
        {/* Hero */}
        <div className="fade-in-up mx-auto max-w-3xl pb-16 pt-12 text-center sm:pt-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Pharmacogenomic Decision Support
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            <span className="text-primary">Precision Drug Safety</span>
            <br />
            <span className="text-foreground">Through Genomics</span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            AI-assisted pharmacogenomic clinical decision support powered by
            deterministic CPIC guidelines.
          </p>

          <Link to="/analysis">
            <Button
              size="lg"
              className="group gap-2 rounded-xl px-8 py-6 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
            >
              Analyze Patient Data
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="clinical-card-hover fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Index;
