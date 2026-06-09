import { PageHeader } from "@/components/page-header";
import { HomeBrowser } from "@/components/home-browser";
import { EXHIBITIONS } from "@/lib/data";

export default function HomePage() {
  return (
    <main>
      <PageHeader
        eyebrow="Copenhagen · June"
        title={{ zh: "3daysofdesign", en: "哥本哈根設計週" }}
        description={{
          zh: "一份屬於你的設計週指南。依你在意的標籤篩選,快速決定哪些展覽值得你花時間。",
          en: "A personal guide to the city's design week. Filter by what you care about, then decide what's worth your time.",
        }}
      />
      <HomeBrowser exhibitions={EXHIBITIONS} />
    </main>
  );
}
