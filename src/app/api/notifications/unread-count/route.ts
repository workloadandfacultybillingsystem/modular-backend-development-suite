import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserType = searchParams.get('targetUserType');
    const targetUserIdParam = searchParams.get('targetUserId');

    // Validate targetUserType if provided
    if (targetUserType) {
      const validUserTypes = ['faculty', 'admin', 'all'];
      if (!validUserTypes.includes(targetUserType)) {
        return NextResponse.json(
          {
            error: `Invalid targetUserType. Must be one of: ${validUserTypes.join(', ')}`,
            code: 'INVALID_TARGET_USER_TYPE',
          },
          { status: 400 }
        );
      }
    }

    // Validate targetUserId if provided
    let targetUserId: number | null = null;
    if (targetUserIdParam) {
      targetUserId = parseInt(targetUserIdParam);
      if (isNaN(targetUserId)) {
        return NextResponse.json(
          {
            error: 'Invalid targetUserId. Must be a valid integer',
            code: 'INVALID_TARGET_USER_ID',
          },
          { status: 400 }
        );
      }
    }

    // Build WHERE conditions
    const conditions = [eq(notifications.isRead, false)];

    if (targetUserType) {
      conditions.push(eq(notifications.targetUserType, targetUserType));
    }

    if (targetUserId !== null) {
      conditions.push(eq(notifications.targetUserId, targetUserId));
    }

    // Execute count query
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions));

    const count = result[0]?.count || 0;

    // Build filters object for response
    const filters: {
      targetUserType?: string;
      targetUserId?: number;
    } = {};

    if (targetUserType) {
      filters.targetUserType = targetUserType;
    }

    if (targetUserId !== null) {
      filters.targetUserId = targetUserId;
    }

    return NextResponse.json(
      {
        count,
        filters,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}