import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activityLogs } from '@/db/schema';
import { eq, gte, lte, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const actionType = searchParams.get('action_type');
    const referenceType = searchParams.get('reference_type');
    const referenceId = searchParams.get('reference_id');
    const userId = searchParams.get('user_id');
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const conditions = [];

    if (actionType) {
      conditions.push(eq(activityLogs.actionType, actionType));
    }

    if (referenceType) {
      conditions.push(eq(activityLogs.referenceType, referenceType));
    }

    if (referenceId) {
      const refId = parseInt(referenceId);
      if (!isNaN(refId)) {
        conditions.push(eq(activityLogs.referenceId, refId));
      }
    }

    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }

    if (severity) {
      conditions.push(eq(activityLogs.severity, severity));
    }

    if (startDate) {
      conditions.push(gte(activityLogs.timestamp, startDate));
    }

    if (endDate) {
      conditions.push(lte(activityLogs.timestamp, endDate));
    }

    let query = db.select().from(activityLogs);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      actionType,
      userId,
      userName,
      description,
      referenceType,
      referenceId,
      previousValue,
      newValue,
      metadata,
      severity,
      isSystemAction
    } = body;

    if (!actionType || actionType.trim() === '') {
      return NextResponse.json(
        { error: 'actionType is required and cannot be empty', code: 'MISSING_ACTION_TYPE' },
        { status: 400 }
      );
    }

    if (!description || description.trim() === '') {
      return NextResponse.json(
        { error: 'description is required and cannot be empty', code: 'MISSING_DESCRIPTION' },
        { status: 400 }
      );
    }

    const validSeverities = ['info', 'warning', 'error', 'success'];
    const finalSeverity = severity && validSeverities.includes(severity) ? severity : 'info';

    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        { 
          error: `severity must be one of: ${validSeverities.join(', ')}`, 
          code: 'INVALID_SEVERITY' 
        },
        { status: 400 }
      );
    }

    if (referenceType && !referenceId) {
      console.warn('Warning: referenceType provided without referenceId');
    }

    if (previousValue) {
      try {
        JSON.parse(previousValue);
      } catch (e) {
        return NextResponse.json(
          { error: 'previousValue must be valid JSON', code: 'INVALID_PREVIOUS_VALUE' },
          { status: 400 }
        );
      }
    }

    if (newValue) {
      try {
        JSON.parse(newValue);
      } catch (e) {
        return NextResponse.json(
          { error: 'newValue must be valid JSON', code: 'INVALID_NEW_VALUE' },
          { status: 400 }
        );
      }
    }

    if (metadata) {
      try {
        JSON.parse(metadata);
      } catch (e) {
        return NextResponse.json(
          { error: 'metadata must be valid JSON', code: 'INVALID_METADATA' },
          { status: 400 }
        );
      }
    }

    const currentTimestamp = new Date().toISOString();

    const insertData: any = {
      actionType: actionType.trim(),
      description: description.trim(),
      timestamp: currentTimestamp,
      createdAt: currentTimestamp,
      severity: finalSeverity,
      isSystemAction: isSystemAction ?? false
    };

    if (userId !== undefined && userId !== null) {
      insertData.userId = userId;
    }

    if (userName !== undefined && userName !== null) {
      insertData.userName = userName;
    }

    if (referenceType !== undefined && referenceType !== null) {
      insertData.referenceType = referenceType;
    }

    if (referenceId !== undefined && referenceId !== null) {
      insertData.referenceId = referenceId;
    }

    if (previousValue !== undefined && previousValue !== null) {
      insertData.previousValue = previousValue;
    }

    if (newValue !== undefined && newValue !== null) {
      insertData.newValue = newValue;
    }

    if (metadata !== undefined && metadata !== null) {
      insertData.metadata = metadata;
    }

    const newLog = await db.insert(activityLogs)
      .values(insertData)
      .returning();

    return NextResponse.json(newLog[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const logId = parseInt(id);

    const existing = await db.select()
      .from(activityLogs)
      .where(eq(activityLogs.id, logId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Activity log not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db.delete(activityLogs)
      .where(eq(activityLogs.id, logId))
      .returning();

    return NextResponse.json({
      message: 'Activity log deleted successfully',
      deleted: deleted[0],
      warning: 'Activity log deleted - this action is permanent'
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}