import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salarySlips, faculty } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { facultyId: string; month: string; year: string } }
) {
  try {
    const facultyId = parseInt(params.facultyId);
    const month = parseInt(params.month);
    const year = parseInt(params.year);

    if (isNaN(facultyId) || isNaN(month) || isNaN(year)) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // Get salary slip with faculty details
    const slips = await db
      .select({
        slip: salarySlips,
        faculty: faculty,
      })
      .from(salarySlips)
      .innerJoin(faculty, eq(salarySlips.facultyId, faculty.id))
      .where(
        and(
          eq(salarySlips.facultyId, facultyId),
          eq(salarySlips.month, month),
          eq(salarySlips.year, year)
        )
      )
      .limit(1);

    if (slips.length === 0) {
      return NextResponse.json(
        { error: 'Salary slip not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...slips[0].slip,
      facultyName: slips[0].faculty.name,
      facultyEmail: slips[0].faculty.email,
      facultyDepartment: slips[0].faculty.department,
    });
  } catch (error) {
    console.error('Error fetching salary slip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salary slip' },
      { status: 500 }
    );
  }
}
