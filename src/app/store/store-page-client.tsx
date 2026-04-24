"use client"

import { useMemo, useState } from "react"
import { formatPriceFromCents } from "@/lib/store"

type StoreItem = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  priceCents: number
  oldPriceCents: number | null
  currency: string
  statusText: string | null
  buttonLabel: string
  purchaseUrl: string | null
  featureList: string[]
  sortOrder: number
}

type StoreCategory = {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  sortOrder: number
  items: StoreItem[]
}

type Props = {
  categories: StoreCategory[]
  totalItems: number
  loadError: boolean
  pageTitle: string
  pageDescription: string
}

export function StorePageClient({
  categories,
  totalItems,
  loadError,
  pageTitle,
  pageDescription,
}: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  )

  const filteredItems = useMemo(() => {
    const source = selectedCategory ? [selectedCategory] : categories

    return source.flatMap((category) =>
      category.items.map((item) => ({
        ...item,
        categoryName: category.name,
      }))
    )
  }, [categories, selectedCategory])

  const comparisonFeatures = useMemo(() => {
    if (!selectedCategory) return []

    return Array.from(
      new Set(selectedCategory.items.flatMap((item) => item.featureList))
    )
  }, [selectedCategory])

  function selectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        document.getElementById("store-products")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      })
    }
  }

  function clearCategoryFilter() {
    setSelectedCategoryId(null)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        document.getElementById("store-products")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      })
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-14 text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{pageTitle}</h1>
        <p className="mx-auto mt-3 max-w-3xl text-sm text-zinc-400 sm:text-base">
          {pageDescription}
        </p>
      </section>

      {categories.length > 0 && (
        <section className="mb-16">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-4 py-1 text-xs font-semibold text-emerald-300">
              Categories
            </span>
            <h2 className="mt-4 text-3xl font-bold text-white">Store Categories</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category) => {
              const hasDiscount = category.items.some(
                (item) => item.oldPriceCents !== null && item.oldPriceCents > item.priceCents
              )

              return (
                <article
                  key={category.id}
                  className={`overflow-hidden rounded-2xl border bg-black/70 transition ${
                    selectedCategoryId === category.id
                      ? "border-emerald-500/60 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="relative aspect-[16/9] bg-zinc-950">
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="h-full w-full object-cover opacity-80"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                        No category image
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                        {category.name}
                      </p>
                      <h3 className="mt-2 text-3xl font-semibold text-white">{category.name}</h3>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
                      <span className="text-emerald-300">
                        {category.items.length} {category.items.length === 1 ? "Product" : "Products"}
                      </span>
                      <span>{hasDiscount ? "Discount available" : category.description || "Editable catalog"}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => selectCategory(category.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm font-semibold text-white transition hover:border-zinc-600"
                    >
                      View
                      <span aria-hidden>→</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section id="store-products" className="mb-16">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 px-4 py-1 text-xs font-semibold text-emerald-300">
            {selectedCategory ? selectedCategory.name : "All Products"}
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white">
            {selectedCategory ? `${selectedCategory.name} Products` : "Products"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            {selectedCategory?.description || `Browse ${totalItems} editable products from your server store.`}
          </p>
          {selectedCategory && (
            <button
              type="button"
              onClick={clearCategoryFilter}
              className="mt-4 inline-flex rounded-full border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              View all products
            </button>
          )}
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const price = formatPriceFromCents(item.priceCents, item.currency)
              const oldPrice =
                item.oldPriceCents && item.oldPriceCents > item.priceCents
                  ? formatPriceFromCents(item.oldPriceCents, item.currency)
                  : null

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-zinc-900 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                >
                  <div className="aspect-[4/3] bg-zinc-950">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover opacity-80"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {item.categoryName}
                      </p>
                      <h3 className="mt-3 text-3xl font-bold text-white">{item.title}</h3>
                    </div>

                    <div className="space-y-1 border-t border-zinc-900 pt-4">
                      {oldPrice && (
                        <p className="text-sm font-medium text-zinc-500 line-through">{oldPrice}</p>
                      )}
                      <p className="text-3xl font-bold text-white">{price}</p>
                    </div>

                    <p className="text-sm text-emerald-300">
                      {item.statusText || "Stock Available"}
                    </p>

                    <p className="min-h-12 text-sm text-zinc-400">
                      {item.description || "Available for purchase on the server."}
                    </p>

                    {item.purchaseUrl ? (
                      <a
                        href={item.purchaseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-500/50 hover:bg-emerald-500/10"
                      >
                        {item.buttonLabel}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex w-full cursor-default items-center justify-center gap-2 rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-500"
                      >
                        {item.buttonLabel}
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-900 bg-black/70 p-10 text-center">
            <p className="text-zinc-400">
              {loadError
                ? "The store could not be loaded. Make sure the database is ready and Prisma migrations have been applied."
                : "No store items have been added yet."}
            </p>
          </div>
        )}
      </section>

      {selectedCategory && comparisonFeatures.length > 0 && selectedCategory.items.length > 0 && (
        <section className="overflow-hidden rounded-[28px] border border-zinc-900 bg-black">
          <div className="bg-emerald-500 px-6 py-5 text-center">
            <h2 className="text-2xl font-extrabold uppercase tracking-[0.12em] text-white">
              Features Comparison
            </h2>
          </div>

          <div className="overflow-x-auto p-6">
            <table className="min-w-full border-separate border-spacing-y-5">
              <thead>
                <tr>
                  <th className="min-w-52 pr-6 text-left text-lg font-semibold text-white">
                    Features
                  </th>
                  {selectedCategory.items.map((item) => {
                    const oldPrice =
                      item.oldPriceCents && item.oldPriceCents > item.priceCents
                        ? formatPriceFromCents(item.oldPriceCents, item.currency)
                        : null

                    return (
                      <th key={item.id} className="min-w-52 px-4 text-center align-top">
                        <div className="space-y-3">
                          <div className="mx-auto h-16 w-16 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-bold text-white">{item.title}</p>
                            {oldPrice && (
                              <p className="text-sm text-zinc-500 line-through">{oldPrice}</p>
                            )}
                            <p className="text-2xl font-bold text-emerald-400">
                              {formatPriceFromCents(item.priceCents, item.currency)}
                            </p>
                          </div>
                          <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {item.statusText || "In stock"}
                          </div>
                          {item.purchaseUrl ? (
                            <a
                              href={item.purchaseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-emerald-400"
                            >
                              {item.buttonLabel}
                            </a>
                          ) : (
                            <div className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-800 px-4 py-3 text-sm font-bold text-zinc-500">
                              {item.buttonLabel}
                            </div>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature}>
                    <td className="pr-6 text-left text-base font-semibold text-white">{feature}</td>
                    {selectedCategory.items.map((item) => {
                      const included = item.featureList.includes(feature)

                      return (
                        <td key={`${item.id}-${feature}`} className="px-4 text-center">
                          <span
                            className={included ? "text-xl text-emerald-400" : "text-xl text-rose-500"}
                            aria-label={included ? "Included" : "Not included"}
                          >
                            {included ? "✓" : "✕"}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
