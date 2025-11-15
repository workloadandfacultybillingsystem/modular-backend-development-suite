import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classrooms, activityLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Helper function to log activity
async function logActivity(activityData: {
  actionType: string;
  description: string;
  referenceType?: string;
  referenceId?: number;
  previousValue?: string;
  newValue?: string;
  severity?: string;
}) {
  try {
    await db.insert(activityLogs).values({
      actionType: activityData.actionType,
      description: activityData.description,
      referenceType: activityData.referenceType || null,
      referenceId: activityData.referenceId || null,
      previousValue: activityData.previousValue || null,
      newValue: activityData.newValue || null,
      severity: activityData.severity || 'info',
      isSystemAction: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't block the main operation if logging fails
  }
}

export async function GET(request: NextRequest) {
  try {
    const allClassrooms = await db.select().from(classrooms);
    
    return NextResponse.json(allClassrooms, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomNumber, building, capacity } = body;

    // Validate required fields
    if (!roomNumber || !building || capacity === undefined) {
      return NextResponse.json(
        { error: 'Room number, building, and capacity are required', code: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      );
    }

    // Create classroom
    const newClassroom = await db.insert(classrooms).values({
      roomNumber: roomNumber.trim(),
      building: building.trim(),
      capacity: parseInt(capacity),
    }).returning();

    // Log activity
    await logActivity({
      actionType: 'CLASSROOM_ADDED',
      description: `Classroom added: ${newClassroom[0].roomNumber} in ${newClassroom[0].building}`,
      referenceType: 'classroom',
      referenceId: newClassroom[0].id,
      newValue: JSON.stringify(newClassroom[0]),
      severity: 'success',
    });

    return NextResponse.json(newClassroom[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const classroomId = parseInt(id);

    // Get existing classroom data
    const existing = await db.select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Classroom not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates = await request.json();

    // Update classroom
    const updated = await db.update(classrooms)
      .set(updates)
      .where(eq(classrooms.id, classroomId))
      .returning();

    // Log activity
    await logActivity({
      actionType: 'CLASSROOM_UPDATED',
      description: `Classroom updated: ${updated[0].roomNumber}`,
      referenceType: 'classroom',
      referenceId: updated[0].id,
      previousValue: JSON.stringify(existing[0]),
      newValue: JSON.stringify(updated[0]),
      severity: 'info',
    });

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const classroomId = parseInt(id);

    // Get existing classroom data
    const existing = await db.select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Classroom not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete classroom
    const deleted = await db.delete(classrooms)
      .where(eq(classrooms.id, classroomId))
      .returning();

    // Log activity
    await logActivity({
      actionType: 'CLASSROOM_DELETED',
      description: `Classroom deleted: ${existing[0].roomNumber}`,
      referenceType: 'classroom',
      referenceId: existing[0].id,
      previousValue: JSON.stringify(existing[0]),
      severity: 'warning',
    });

    return NextResponse.json(
      {
        message: 'Classroom deleted successfully',
        deleted: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}