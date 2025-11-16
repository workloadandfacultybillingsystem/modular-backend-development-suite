import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserType, targetUserId } = body;

    // Validate targetUserType is provided
    if (!targetUserType) {
      return NextResponse.json(
        { 
          error: 'targetUserType is required',
          code: 'MISSING_TARGET_USER_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate targetUserType is one of the allowed values
    const validTargetUserTypes = ['faculty', 'admin', 'all'];
    if (!validTargetUserTypes.includes(targetUserType)) {
      return NextResponse.json(
        { 
          error: `targetUserType must be one of: ${validTargetUserTypes.join(', ')}`,
          code: 'INVALID_TARGET_USER_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate targetUserId is provided when targetUserType is 'faculty' or 'admin'
    if ((targetUserType === 'faculty' || targetUserType === 'admin') && !targetUserId) {
      return NextResponse.json(
        { 
          error: `targetUserId is required when targetUserType is '${targetUserType}'`,
          code: 'MISSING_TARGET_USER_ID' 
        },
        { status: 400 }
      );
    }

    // Validate targetUserId is a valid integer if provided
    if (targetUserId !== undefined && targetUserId !== null) {
      const parsedUserId = parseInt(targetUserId.toString());
      if (isNaN(parsedUserId)) {
        return NextResponse.json(
          { 
            error: 'targetUserId must be a valid integer',
            code: 'INVALID_TARGET_USER_ID' 
          },
          { status: 400 }
        );
      }
    }

    // Build WHERE clause based on targetUserType and targetUserId
    let whereConditions;
    
    if (targetUserType === 'all') {
      // For 'all', update all unread notifications with targetUserType = 'all'
      whereConditions = and(
        eq(notifications.targetUserType, targetUserType),
        eq(notifications.isRead, false)
      );
    } else if (targetUserId) {
      // For specific user type with user ID
      whereConditions = and(
        eq(notifications.targetUserType, targetUserType),
        eq(notifications.targetUserId, parseInt(targetUserId.toString())),
        eq(notifications.isRead, false)
      );
    } else {
      // For user type without specific user ID (shouldn't reach here due to validation)
      whereConditions = and(
        eq(notifications.targetUserType, targetUserType),
        eq(notifications.isRead, false)
      );
    }

    // Update all matching notifications
    const currentTimestamp = new Date().toISOString();
    const updated = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: currentTimestamp
      })
      .where(whereConditions)
      .returning();

    const count = updated.length;

    return NextResponse.json(
      {
        message: `${count} notification${count !== 1 ? 's' : ''} marked as read`,
        count
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}