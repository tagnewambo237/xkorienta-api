import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import School from "@/models/School"
import { SchoolStatus } from "@/models/enums"
import { ORIENTATION_SCHOOLS_MOCK } from "@/lib/mocks/orientationSchools"

/**
 * GET /api/student/orientation/schools
 * Liste des écoles proposées (établissements partenaires VALIDATED).
 * - Optionnel: ?search=...
 * - Fallback: mocks si DB indisponible (dev)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""

  try {
    await connectDB()

    const query: any = {
      status: SchoolStatus.VALIDATED,
      isActive: true,
    }

    if (search) {
      query.name = { $regex: search, $options: "i" }
    }

    const schools = await School.find(query)
      .select("name type address logoUrl status contactInfo")
      .sort({ name: 1 })
      .limit(50)
      .lean()

    const dto = schools.map((s: any) => ({
      _id: s._id.toString(),
      name: s.name,
      type: s.type,
      address: s.address,
      logoUrl: s.logoUrl,
      status: s.status,
      contactInfo: s.contactInfo,
    }))

    return NextResponse.json({ success: true, data: dto })
  } catch (error) {
    console.error("[Orientation Schools API] Error:", error)

    // Fallback mocks so the UI can be displayed even without Mongo
    const filtered = search
      ? ORIENTATION_SCHOOLS_MOCK.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      : ORIENTATION_SCHOOLS_MOCK

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: { source: "mock" },
    })
  }
}

