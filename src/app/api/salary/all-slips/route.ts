import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salarySlips, faculty } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const facultyId = searchParams.get('facultyId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = db
      .select({
        slip: salarySlips,
        faculty: faculty,
      })
      .from(salarySlips)
      .innerJoin(faculty, eq(salarySlips.facultyId, faculty.id))
      .orderBy(desc(salarySlips.year), desc(salarySlips.month))
      .limit(limit);

    // Apply filters if provided
    if (facultyId) {
      query = query.where(eq(salarySlips.facultyId, parseInt(facultyId))) as any;
    }

    const slips = await query;

    const formatted = slips.map((item) => ({
      ...item.slip,
      facultyName: item.faculty.name,
      facultyEmail: item.faculty.email,
      facultyDepartment: item.faculty.department,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching salary slips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salary slips' },
      { status: 500 }
    );
  }
}
