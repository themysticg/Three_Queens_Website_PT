import { getRulesTree } from "@/lib/rules";
import { RulesPageClient } from "./rules-page-client";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const categories = await getRulesTree();
  return <RulesPageClient initialCategories={categories} />;
}
