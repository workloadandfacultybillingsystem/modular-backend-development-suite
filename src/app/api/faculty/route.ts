import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faculty, activityLogs } from '@/db/schema';
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
    const allFaculty = await db.select().from(faculty);
    
    return NextResponse.json(allFaculty, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, department } = body;

    // Validate required fields
    if (!name || !email || !department) {
      return NextResponse.json(
        { error: 'Name, email, and department are required', code: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      );
    }

    // Create faculty
    const newFaculty = await db.insert(faculty).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: department.trim(),
    }).returning();

    // Log activity
    await logActivity({
      actionType: 'FACULTY_ADDED',
      description: `Faculty added: ${newFaculty[0].name}`,
      referenceType: 'faculty',
      referenceId: newFaculty[0].id,
      newValue: JSON.stringify(newFaculty[0]),
      severity: 'success',
    });

    return NextResponse.json(newFaculty[0], { status: 201 });
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

    const facultyId = parseInt(id);

    // Get existing faculty data
    const existing = await db.select()
      .from(faculty)
      .where(eq(faculty.id, facultyId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Faculty not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates = await request.json();

    // Update faculty
    const updated = await db.update(faculty)
      .set(updates)
      .where(eq(faculty.id, facultyId))
      .returning();

    // Log activity
    await logActivity({
      actionType: 'FACULTY_UPDATED',
      description: `Faculty updated: ${updated[0].name}`,
      referenceType: 'faculty',
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

    const facultyId = parseInt(id);

    // Get existing faculty data
    const existing = await db.select()
      .from(faculty)
      .where(eq(faculty.id, facultyId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Faculty not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete faculty
    const deleted = await db.delete(faculty)
      .where(eq(faculty.id, facultyId))
      .returning();

    // Log activity
    await logActivity({
      actionType: 'FACULTY_DELETED',
      description: `Faculty deleted: ${existing[0].name}`,
      referenceType: 'faculty',
      referenceId: existing[0].id,
      previousValue: JSON.stringify(existing[0]),
      severity: 'warning',
    });

    return NextResponse.json(
      {
        message: 'Faculty deleted successfully',
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