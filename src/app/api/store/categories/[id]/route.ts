import { NextResponse } from "next/server"
import { auth, resolveSessionUserId, unauthorizedOrDatabaseError } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canManageStore } from "@/lib/store"

async function ensureStoreAdmin() {
  const session = await auth()
  const result = await resolveSessionUserId(session)
  if (!result.ok) {
    return { errorResponse: unauthorizedOrDatabaseError(result) }
  }

  const adminType = (session?.user as { adminType?: string | null } | undefined)?.adminType
  if (!canManageStore(adminType)) {
    return {
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    }
  }

  return { errorResponse: null }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await ensureStoreAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const { id } = await params

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

    const category = await prisma.storeCategory.update({
      where: { id },
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

    return NextResponse.json(category)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to update store category" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await ensureStoreAdmin()
  if (guard.errorResponse) return guard.errorResponse

  const { id } = await params

  try {
    await prisma.storeCategory.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to delete store category" }, { status: 500 })
  }
}
