import { prisma } from "@/lib/prisma"
import { parseFeatureListFromJson } from "@/lib/store"
import { getBrandingSettings } from "@/lib/site-settings"
import { StorePageClient } from "./store-page-client"

export const dynamic = "force-dynamic"

async function getStoreData() {
  const categories = await prisma.storeCategory.findMany({
    include: {
      items: {
        where: {
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    imageUrl: category.imageUrl,
    sortOrder: category.sortOrder,
    items: category.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      priceCents: item.priceCents,
      oldPriceCents: item.oldPriceCents,
      currency: item.currency,
      statusText: item.statusText,
      buttonLabel: item.buttonLabel,
      purchaseUrl: item.purchaseUrl,
      featureList: parseFeatureListFromJson(item.featureList),
      sortOrder: item.sortOrder,
    })),
  }))
}

export default async function StorePage() {
  let categories: Awaited<ReturnType<typeof getStoreData>> = []
  let loadError = false
  const branding = await getBrandingSettings()

  try {
    categories = await getStoreData()
  } catch (error) {
    console.error("[store] Error loading store catalog:", error)
    loadError = true
  }

  const totalItems = categories.reduce((count, category) => count + category.items.length, 0)

  return (
    <StorePageClient
      categories={categories}
      totalItems={totalItems}
      loadError={loadError}
      pageTitle={branding.storePageTitle}
      pageDescription={branding.storePageDescription}
    />
  )
}
