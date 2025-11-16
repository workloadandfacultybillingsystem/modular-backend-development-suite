import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { holidays } from '@/db/schema';
import { eq, and, or, isNull, like, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get('department');
    const year = searchParams.get('year');

    let query = db.select().from(holidays);

    const conditions = [];

    // Filter by department: null (affects all) OR matches the specified department
    if (department) {
      conditions.push(
        or(
          isNull(holidays.affectsDepartment),
          eq(holidays.affectsDepartment, department)
        )
      );
    }

    // Filter by year: date starts with the year
    if (year) {
      // Validate year format (4 digits)
      if (!/^\d{4}$/.test(year)) {
        return NextResponse.json(
          { 
            error: 'Invalid year format. Must be a 4-digit year.',
            code: 'INVALID_YEAR_FORMAT' 
          },
          { status: 400 }
        );
      }
      conditions.push(like(holidays.date, `${year}-%`));
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Sort by date ascending
    const results = await query.orderBy(asc(holidays.date));

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, name, description, affectsDepartment } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json(
        { 
          error: 'Date is required',
          code: 'MISSING_DATE' 
        },
        { status: 400 }
      );
    }

    if (!name || (typeof name === 'string' && name.trim().length === 0)) {
      return NextResponse.json(
        { 
          error: 'Name is required and cannot be empty',
          code: 'MISSING_NAME' 
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { 
          error: 'Invalid date format. Must be YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT' 
        },
        { status: 400 }
      );
    }

    // Additional validation: check if date is actually valid (e.g., not 2024-02-31)
    const dateObj = new Date(date);
    const [year, month, day] = date.split('-').map(Number);
    if (
      dateObj.getFullYear() !== year ||
      dateObj.getMonth() + 1 !== month ||
      dateObj.getDate() !== day
    ) {
      return NextResponse.json(
        { 
          error: 'Invalid date. Please provide a valid calendar date.',
          code: 'INVALID_DATE' 
        },
        { status: 400 }
      );
    }

    // Prepare insert data
    const insertData = {
      date: date.trim(),
      name: name.trim(),
      description: description ? (typeof description === 'string' ? description.trim() : description) : null,
      affectsDepartment: affectsDepartment ? (typeof affectsDepartment === 'string' ? affectsDepartment.trim() : affectsDepartment) : null,
      createdAt: new Date().toISOString(),
    };

    // Insert into database
    const newHoliday = await db.insert(holidays)
      .values(insertData)
      .returning();

    return NextResponse.json(newHoliday[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}