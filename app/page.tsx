import { PageHeader } from "@/components/page-header";
import { HomeBrowser } from "@/components/home-browser";
import { EXHIBITIONS } from "@/lib/data";

export default function HomePage() {
  return (
    <main>
      <PageHeader
        eyebrow="Copenhagen · June"
        title="3daysofdesign"
        description="A personal guide to the city's design week. Filter by what you care about, then decide what's worth your time."
      />
      <HomeBrowser exhibitions={EXHIBITIONS} />
    </main>
  );
}
