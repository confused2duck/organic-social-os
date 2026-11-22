import { PageHeader } from "@/components/layout/page-header";
import { OnboardingForm } from "@/components/onboarding-form";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div>
      <PageHeader title="Create a company workspace" description="Set up a new company. Each workspace keeps its brand, content, calendar and analytics fully isolated." />
      <OnboardingForm />
    </div>
  );
}
