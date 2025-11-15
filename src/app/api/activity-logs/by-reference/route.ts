import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activityLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    // Validate type parameter
    if (!type) {
      return NextResponse.json(
        { 
          error: 'Reference type is required',
          code: 'MISSING_REFERENCE_TYPE'
        },
        { status: 400 }
      );
    }

    // Validate id parameter
    if (!id) {
      return NextResponse.json(
        { 
          error: 'Reference ID is required',
          code: 'MISSING_REFERENCE_ID'
        },
        { status: 400 }
      );
    }

    // Validate id is a valid integer
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { 
          error: 'Reference ID must be a valid integer',
          code: 'INVALID_REFERENCE_ID'
        },
        { status: 400 }
      );
    }

    // Query activity logs by referenceType and referenceId, sorted by timestamp DESC
    const logs = await db.select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.referenceType, type),
          eq(activityLogs.referenceId, parsedId)
        )
      )
      .orderBy(desc(activityLogs.timestamp));

    return NextResponse.json(logs, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}