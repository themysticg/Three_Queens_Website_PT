import { NextResponse } from "next/server"
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  canManageStore,
  parseFeatureList,
  parseFeatureListFromJson,
  parseOptionalPriceToCents,
  parsePriceToCents,
} from "@/lib/store"

function serializeStoreItem(item: Awaited<ReturnType<typeof prisma.storeItem.create>>) {
  return {
    ...item,
    featureList: parseFeatureListFromJson(item.featureList),
  }
}

export async function GET() {
  const session = await auth()
  const result = await resolveSessionUserId(session)
  if (!result.ok) return unauthorizedOrDatabaseError(result)

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType
  if (!canManageStore(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const items = await prisma.storeItem.findMany({
      include: {
        category: true,
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    })

    return NextResponse.json(items.map(serializeStoreItem))
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load store items" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  const result = await resolveSessionUserId(session)
  if (!result.ok) return unauthorizedOrDatabaseError(result)

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType
  if (!canManageStore(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null
    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0
        ? body.imageUrl.trim()
        : null
    const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : ""
    const statusText =
      typeof body.statusText === "string" && body.statusText.trim().length > 0
        ? body.statusText.trim()
        : null
    const buttonLabel =
      typeof body.buttonLabel === "string" && body.buttonLabel.trim().length > 0
        ? body.buttonLabel.trim()
        : "Buy now"
    const purchaseUrl =
      typeof body.purchaseUrl === "string" && body.purchaseUrl.trim().length > 0
        ? body.purchaseUrl.trim()
        : null
    const currency = typeof body.currency === "string" && body.currency.trim()
      ? body.currency.trim().toUpperCase()
      : "TND"
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0
    const isActive = body.isActive !== false
    const priceCents = parsePriceToCents(body.price)
    const oldPriceCents = parseOptionalPriceToCents(body.oldPrice)
    const featureList = JSON.stringify(parseFeatureList(body.featureList))

    if (!title || !categoryId) {
      return NextResponse.json({ error: "Title and category are required" }, { status: 400 })
    }

    if (priceCents === null) {
      return NextResponse.json({ error: "Enter a valid price" }, { status: 400 })
    }

    const item = await prisma.storeItem.create({
      data: {
        categoryId,
        title,
        description,
        imageUrl,
        priceCents,
        oldPriceCents,
        currency,
        statusText,
        buttonLabel,
        purchaseUrl,
        featureList,
        sortOrder,
        isActive,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(serializeStoreItem(item), { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create store item" }, { status: 500 })
  }
}
