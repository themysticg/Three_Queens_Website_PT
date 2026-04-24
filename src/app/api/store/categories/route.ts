import { NextResponse } from "next/server"
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canManageStore } from "@/lib/store"

export async function GET() {
  const session = await auth()
  const result = await resolveSessionUserId(session)
  if (!result.ok) return unauthorizedOrDatabaseError(result)

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType
  if (!canManageStore(adminType)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const categories = await prisma.storeCategory.findMany({
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to load store categories" }, { status: 500 })
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
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null
    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0
        ? body.imageUrl.trim()
        : null
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const category = await prisma.storeCategory.create({
      data: {
        name,
        description,
        imageUrl,
        sortOrder,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to create store category" }, { status: 500 })
  }
}
