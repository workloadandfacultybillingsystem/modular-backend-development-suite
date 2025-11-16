import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_NOTIFICATION_TYPES = ['info', 'warning', 'conflict', 'approval_required', 'system'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_TARGET_USER_TYPES = ['faculty', 'admin', 'all'];
const VALID_REFERENCE_TYPES = ['timetable', 'holiday', 'exam_duty', 'salary', 'workload', 'schedule_change'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const targetUserType = searchParams.get('targetUserType');
    const targetUserId = searchParams.get('targetUserId');
    const isRead = searchParams.get('isRead');
    const notificationType = searchParams.get('notificationType');
    const severity = searchParams.get('severity');

    let query = db.select().from(notifications);

    const conditions = [];

    if (targetUserType) {
      if (!VALID_TARGET_USER_TYPES.includes(targetUserType)) {
        return NextResponse.json({
          error: `Invalid targetUserType. Must be one of: ${VALID_TARGET_USER_TYPES.join(', ')}`,
          code: 'INVALID_TARGET_USER_TYPE'
        }, { status: 400 });
      }
      conditions.push(eq(notifications.targetUserType, targetUserType));
    }

    if (targetUserId) {
      const userId = parseInt(targetUserId);
      if (isNaN(userId)) {
        return NextResponse.json({
          error: 'Invalid targetUserId. Must be a valid integer',
          code: 'INVALID_TARGET_USER_ID'
        }, { status: 400 });
      }
      conditions.push(eq(notifications.targetUserId, userId));
    }

    if (isRead !== null && isRead !== undefined) {
      const readValue = isRead === 'true';
      conditions.push(eq(notifications.isRead, readValue));
    }

    if (notificationType) {
      if (!VALID_NOTIFICATION_TYPES.includes(notificationType)) {
        return NextResponse.json({
          error: `Invalid notificationType. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
          code: 'INVALID_NOTIFICATION_TYPE'
        }, { status: 400 });
      }
      conditions.push(eq(notifications.notificationType, notificationType));
    }

    if (severity) {
      if (!VALID_SEVERITIES.includes(severity)) {
        return NextResponse.json({
          error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`,
          code: 'INVALID_SEVERITY'
        }, { status: 400 });
      }
      conditions.push(eq(notifications.severity, severity));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      message,
      notificationType,
      severity,
      targetUserType,
      targetUserId,
      referenceType,
      referenceId,
      metadata,
      isRead,
      isSent
    } = body;

    // Validate required fields
    if (!title || title.trim() === '') {
      return NextResponse.json({
        error: 'Title is required',
        code: 'MISSING_TITLE'
      }, { status: 400 });
    }

    if (!message || message.trim() === '') {
      return NextResponse.json({
        error: 'Message is required',
        code: 'MISSING_MESSAGE'
      }, { status: 400 });
    }

    if (!notificationType) {
      return NextResponse.json({
        error: 'Notification type is required',
        code: 'MISSING_NOTIFICATION_TYPE'
      }, { status: 400 });
    }

    if (!VALID_NOTIFICATION_TYPES.includes(notificationType)) {
      return NextResponse.json({
        error: `Invalid notificationType. Must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
        code: 'INVALID_NOTIFICATION_TYPE'
      }, { status: 400 });
    }

    if (!severity) {
      return NextResponse.json({
        error: 'Severity is required',
        code: 'MISSING_SEVERITY'
      }, { status: 400 });
    }

    if (!VALID_SEVERITIES.includes(severity)) {
      return NextResponse.json({
        error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`,
        code: 'INVALID_SEVERITY'
      }, { status: 400 });
    }

    if (!targetUserType) {
      return NextResponse.json({
        error: 'Target user type is required',
        code: 'MISSING_TARGET_USER_TYPE'
      }, { status: 400 });
    }

    if (!VALID_TARGET_USER_TYPES.includes(targetUserType)) {
      return NextResponse.json({
        error: `Invalid targetUserType. Must be one of: ${VALID_TARGET_USER_TYPES.join(', ')}`,
        code: 'INVALID_TARGET_USER_TYPE'
      }, { status: 400 });
    }

    // Validate optional fields
    if (referenceType && !VALID_REFERENCE_TYPES.includes(referenceType)) {
      return NextResponse.json({
        error: `Invalid referenceType. Must be one of: ${VALID_REFERENCE_TYPES.join(', ')}`,
        code: 'INVALID_REFERENCE_TYPE'
      }, { status: 400 });
    }

    if (metadata) {
      try {
        JSON.parse(metadata);
      } catch (e) {
        return NextResponse.json({
          error: 'Metadata must be valid JSON',
          code: 'INVALID_METADATA_JSON'
        }, { status: 400 });
      }
    }

    if (targetUserId !== undefined && targetUserId !== null && isNaN(parseInt(targetUserId))) {
      return NextResponse.json({
        error: 'Target user ID must be a valid integer',
        code: 'INVALID_TARGET_USER_ID'
      }, { status: 400 });
    }

    if (referenceId !== undefined && referenceId !== null && isNaN(parseInt(referenceId))) {
      return NextResponse.json({
        error: 'Reference ID must be a valid integer',
        code: 'INVALID_REFERENCE_ID'
      }, { status: 400 });
    }

    const currentTimestamp = new Date().toISOString();

    const insertData: any = {
      title: title.trim(),
      message: message.trim(),
      notificationType,
      severity,
      targetUserType,
      sentAt: currentTimestamp,
      createdAt: currentTimestamp,
      isRead: isRead !== undefined ? isRead : false,
      isSent: isSent !== undefined ? isSent : true
    };

    if (targetUserId !== undefined && targetUserId !== null) {
      insertData.targetUserId = parseInt(targetUserId);
    }

    if (referenceType) {
      insertData.referenceType = referenceType;
    }

    if (referenceId !== undefined && referenceId !== null) {
      insertData.referenceId = parseInt(referenceId);
    }

    if (metadata) {
      insertData.metadata = metadata;
    }

    const newNotification = await db.insert(notifications)
      .values(insertData)
      .returning();

    return NextResponse.json(newNotification[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const notificationId = parseInt(id);

    // Check if notification exists
    const existing = await db.select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      }, { status: 404 });
    }

    const currentTimestamp = new Date().toISOString();

    const updated = await db.update(notifications)
      .set({
        isRead: true,
        readAt: currentTimestamp
      })
      .where(eq(notifications.id, notificationId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({
        error: 'Valid ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const notificationId = parseInt(id);

    // Check if notification exists
    const existing = await db.select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      }, { status: 404 });
    }

    const deleted = await db.delete(notifications)
      .where(eq(notifications.id, notificationId))
      .returning();

    return NextResponse.json({
      message: 'Notification deleted successfully',
      notification: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error as Error).message
    }, { status: 500 });
  }
}