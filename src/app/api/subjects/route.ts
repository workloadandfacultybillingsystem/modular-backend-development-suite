import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subjects, activityLogs } from '@/db/schema';
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
    const allSubjects = await db.select().from(subjects);
    
    return NextResponse.json(allSubjects, { status: 200 });
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, credits } = body;

    // Validate required fields
    if (!name || !code || credits === undefined) {
      return NextResponse.json(
        { error: 'Name, code, and credits are required', code: 'MISSING_REQUIRED_FIELDS' },
        { status: 400 }
      );
    }

    // Create subject
    const newSubject = await db.insert(subjects).values({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      credits: parseInt(credits),
    }).returning();

    // Log activity
    await logActivity({
      actionType: 'SUBJECT_ADDED',
      description: `Subject added: ${newSubject[0].name} (${newSubject[0].code})`,
      referenceType: 'subject',
      referenceId: newSubject[0].id,
      newValue: JSON.stringify(newSubject[0]),
      severity: 'success',
    });

    return NextResponse.json(newSubject[0], { status: 201 });
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

    const subjectId = parseInt(id);

    // Get existing subject data
    const existing = await db.select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Subject not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates = await request.json();

    // Update subject
    const updated = await db.update(subjects)
      .set(updates)
      .where(eq(subjects.id, subjectId))
      .returning();

    // Log activity
    await logActivity({
      actionType: 'SUBJECT_UPDATED',
      description: `Subject updated: ${updated[0].name}`,
      referenceType: 'subject',
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

    const subjectId = parseInt(id);

    // Get existing subject data
    const existing = await db.select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Subject not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete subject
    const deleted = await db.delete(subjects)
      .where(eq(subjects.id, subjectId))
      .returning();

    // Log activity
    await logActivity({
      actionType: 'SUBJECT_DELETED',
      description: `Subject deleted: ${existing[0].name}`,
      referenceType: 'subject',
      referenceId: existing[0].id,
      previousValue: JSON.stringify(existing[0]),
      severity: 'warning',
    });

    return NextResponse.json(
      {
        message: 'Subject deleted successfully',
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