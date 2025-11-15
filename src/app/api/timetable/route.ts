import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { timetable, faculty, subjects, classrooms, activityLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Helper function to log activity
async function logActivity(activityData: {
  actionType: string;
  description: string;
  referenceType?: string;
  referenceId?: number;
  previousValue?: string;
  newValue?: string;
  metadata?: string;
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
      metadata: activityData.metadata || null,
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

// Helper function to check if two time slots overlap
function timeSlotsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const [h1, m1] = start1.split(':').map(Number);
  const [h2, m2] = end1.split(':').map(Number);
  const [h3, m3] = start2.split(':').map(Number);
  const [h4, m4] = end2.split(':').map(Number);
  
  const start1Minutes = h1 * 60 + m1;
  const end1Minutes = h2 * 60 + m2;
  const start2Minutes = h3 * 60 + m3;
  const end2Minutes = h4 * 60 + m4;
  
  // Check if time slots overlap
  return (start1Minutes < end2Minutes && end1Minutes > start2Minutes);
}

export async function GET(request: NextRequest) {
  try {
    const results = await db
      .select({
        id: timetable.id,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        semester: timetable.semester,
        studentGroup: timetable.studentGroup,
        createdAt: timetable.createdAt,
        faculty: {
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          credits: subjects.credits,
        },
        classroom: {
          id: classrooms.id,
          roomNumber: classrooms.roomNumber,
          building: classrooms.building,
          capacity: classrooms.capacity,
        },
      })
      .from(timetable)
      .leftJoin(faculty, eq(timetable.facultyId, faculty.id))
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .leftJoin(classrooms, eq(timetable.classroomId, classrooms.id));

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
      facultyId,
      subjectId,
      classroomId,
      dayOfWeek,
      startTime,
      endTime,
      semester,
      studentGroup,
    } = body;

    // Validate required fields
    if (!facultyId) {
      return NextResponse.json(
        { error: 'Faculty ID is required', code: 'MISSING_FACULTY_ID' },
        { status: 400 }
      );
    }

    if (!subjectId) {
      return NextResponse.json(
        { error: 'Subject ID is required', code: 'MISSING_SUBJECT_ID' },
        { status: 400 }
      );
    }

    if (!classroomId) {
      return NextResponse.json(
        { error: 'Classroom ID is required', code: 'MISSING_CLASSROOM_ID' },
        { status: 400 }
      );
    }

    if (!dayOfWeek) {
      return NextResponse.json(
        { error: 'Day of week is required', code: 'MISSING_DAY_OF_WEEK' },
        { status: 400 }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        { error: 'Start time is required', code: 'MISSING_START_TIME' },
        { status: 400 }
      );
    }

    if (!endTime) {
      return NextResponse.json(
        { error: 'End time is required', code: 'MISSING_END_TIME' },
        { status: 400 }
      );
    }

    if (!semester) {
      return NextResponse.json(
        { error: 'Semester is required', code: 'MISSING_SEMESTER' },
        { status: 400 }
      );
    }

    if (!studentGroup) {
      return NextResponse.json(
        { error: 'Student group is required', code: 'MISSING_STUDENT_GROUP' },
        { status: 400 }
      );
    }

    // Validate dayOfWeek
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (!validDays.includes(dayOfWeek)) {
      return NextResponse.json(
        {
          error: 'Day of week must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
          code: 'INVALID_DAY_OF_WEEK',
        },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime)) {
      return NextResponse.json(
        { error: 'Start time must be in HH:MM format', code: 'INVALID_START_TIME_FORMAT' },
        { status: 400 }
      );
    }

    if (!timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'End time must be in HH:MM format', code: 'INVALID_END_TIME_FORMAT' },
        { status: 400 }
      );
    }

    // Validate that end time is after start time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: 'End time must be after start time', code: 'INVALID_TIME_RANGE' },
        { status: 400 }
      );
    }

    // Validate that foreign keys exist
    const facultyExists = await db.select().from(faculty).where(eq(faculty.id, parseInt(facultyId))).limit(1);
    if (facultyExists.length === 0) {
      return NextResponse.json(
        { error: 'Faculty not found', code: 'FACULTY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const subjectExists = await db.select().from(subjects).where(eq(subjects.id, parseInt(subjectId))).limit(1);
    if (subjectExists.length === 0) {
      return NextResponse.json(
        { error: 'Subject not found', code: 'SUBJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const classroomExists = await db.select().from(classrooms).where(eq(classrooms.id, parseInt(classroomId))).limit(1);
    if (classroomExists.length === 0) {
      return NextResponse.json(
        { error: 'Classroom not found', code: 'CLASSROOM_NOT_FOUND' },
        { status: 404 }
      );
    }

    // CONFLICT DETECTION: Check for scheduling conflicts
    
    // Get all timetable entries for the same day
    const sameDayEntries = await db
      .select({
        id: timetable.id,
        facultyId: timetable.facultyId,
        classroomId: timetable.classroomId,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        semester: timetable.semester,
        studentGroup: timetable.studentGroup,
        facultyName: faculty.name,
        classroomNumber: classrooms.roomNumber,
      })
      .from(timetable)
      .leftJoin(faculty, eq(timetable.facultyId, faculty.id))
      .leftJoin(classrooms, eq(timetable.classroomId, classrooms.id))
      .where(eq(timetable.dayOfWeek, dayOfWeek));

    // Check for conflicts
    for (const entry of sameDayEntries) {
      const hasTimeOverlap = timeSlotsOverlap(startTime, endTime, entry.startTime, entry.endTime);
      
      if (hasTimeOverlap) {
        // Conflict 1: Faculty conflict
        if (entry.facultyId === parseInt(facultyId)) {
          const conflictDetails = {
            type: 'faculty',
            facultyName: entry.facultyName,
            day: dayOfWeek,
            existingStartTime: entry.startTime,
            existingEndTime: entry.endTime,
            requestedStartTime: startTime,
            requestedEndTime: endTime,
          };

          // Log conflict detection
          await logActivity({
            actionType: 'CONFLICT_DETECTED',
            description: `Faculty conflict detected: ${entry.facultyName} already has a class on ${dayOfWeek} from ${entry.startTime} to ${entry.endTime}`,
            metadata: JSON.stringify(conflictDetails),
            severity: 'warning',
          });

          return NextResponse.json(
            {
              error: `Faculty conflict: ${entry.facultyName} already has a class on ${dayOfWeek} from ${entry.startTime} to ${entry.endTime}`,
              code: 'FACULTY_CONFLICT',
              conflictDetails
            },
            { status: 409 }
          );
        }

        // Conflict 2: Classroom conflict
        if (entry.classroomId === parseInt(classroomId)) {
          const conflictDetails = {
            type: 'classroom',
            classroomNumber: entry.classroomNumber,
            day: dayOfWeek,
            existingStartTime: entry.startTime,
            existingEndTime: entry.endTime,
            requestedStartTime: startTime,
            requestedEndTime: endTime,
          };

          // Log conflict detection
          await logActivity({
            actionType: 'CONFLICT_DETECTED',
            description: `Classroom conflict detected: ${entry.classroomNumber} is already booked on ${dayOfWeek} from ${entry.startTime} to ${entry.endTime}`,
            metadata: JSON.stringify(conflictDetails),
            severity: 'warning',
          });

          return NextResponse.json(
            {
              error: `Classroom conflict: ${entry.classroomNumber} is already booked on ${dayOfWeek} from ${entry.startTime} to ${entry.endTime}`,
              code: 'CLASSROOM_CONFLICT',
              conflictDetails
            },
            { status: 409 }
          );
        }

        // Conflict 3: Student group conflict (same semester and student group)
        if (entry.semester === semester && entry.studentGroup === studentGroup) {
          const conflictDetails = {
            type: 'student_group',
            semester: semester,
            studentGroup: studentGroup,
            day: dayOfWeek,
            existingStartTime: entry.startTime,
            existingEndTime: entry.endTime,
            requestedStartTime: startTime,
            requestedEndTime: endTime,
          };

          // Log conflict detection
          await logActivity({
            actionType: 'CONFLICT_DETECTED',
            description: `Student group conflict detected: ${studentGroup} in ${semester} already has a class on ${dayOfWeek} from ${entry.startTime} to ${entry.endTime}`,
            metadata: JSON.stringify(conflictDetails),
            severity: 'warning',
          });

          return NextResponse.json(
            {
              error: `Student group conflict: ${studentGroup} in ${semester} already has a class on ${dayOfWeek} from ${entry.startTime} to ${entry.endTime}`,
              code: 'STUDENT_GROUP_CONFLICT',
              conflictDetails
            },
            { status: 409 }
          );
        }
      }
    }

    // No conflicts found - create new timetable entry
    const newEntry = await db
      .insert(timetable)
      .values({
        facultyId: parseInt(facultyId),
        subjectId: parseInt(subjectId),
        classroomId: parseInt(classroomId),
        dayOfWeek,
        startTime,
        endTime,
        semester,
        studentGroup,
        createdAt: new Date().toISOString(),
      })
      .returning();

    // Fetch the complete entry with joined data
    const completeEntry = await db
      .select({
        id: timetable.id,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        semester: timetable.semester,
        studentGroup: timetable.studentGroup,
        createdAt: timetable.createdAt,
        faculty: {
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          credits: subjects.credits,
        },
        classroom: {
          id: classrooms.id,
          roomNumber: classrooms.roomNumber,
          building: classrooms.building,
          capacity: classrooms.capacity,
        },
      })
      .from(timetable)
      .leftJoin(faculty, eq(timetable.facultyId, faculty.id))
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .leftJoin(classrooms, eq(timetable.classroomId, classrooms.id))
      .where(eq(timetable.id, newEntry[0].id))
      .limit(1);

    // Log successful timetable creation
    await logActivity({
      actionType: 'TIMETABLE_CREATED',
      description: `Class scheduled: ${completeEntry[0].subject?.name} by ${completeEntry[0].faculty?.name} on ${dayOfWeek} at ${startTime} in ${completeEntry[0].classroom?.roomNumber}`,
      referenceType: 'timetable',
      referenceId: completeEntry[0].id,
      newValue: JSON.stringify(completeEntry[0]),
      severity: 'success',
    });

    return NextResponse.json(
      {
        message: 'Timetable entry created successfully',
        entry: completeEntry[0],
      },
      { status: 201 }
    );
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

    const timetableId = parseInt(id);

    // Get existing timetable data with joined information
    const existing = await db
      .select({
        id: timetable.id,
        facultyId: timetable.facultyId,
        subjectId: timetable.subjectId,
        classroomId: timetable.classroomId,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        semester: timetable.semester,
        studentGroup: timetable.studentGroup,
        createdAt: timetable.createdAt,
        faculty: {
          id: faculty.id,
          name: faculty.name,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
        },
      })
      .from(timetable)
      .leftJoin(faculty, eq(timetable.facultyId, faculty.id))
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .where(eq(timetable.id, timetableId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Timetable entry not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates = await request.json();

    // Update timetable entry
    const updated = await db.update(timetable)
      .set(updates)
      .where(eq(timetable.id, timetableId))
      .returning();

    // Fetch updated entry with joined data
    const completeUpdated = await db
      .select({
        id: timetable.id,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        semester: timetable.semester,
        studentGroup: timetable.studentGroup,
        createdAt: timetable.createdAt,
        faculty: {
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          credits: subjects.credits,
        },
        classroom: {
          id: classrooms.id,
          roomNumber: classrooms.roomNumber,
          building: classrooms.building,
          capacity: classrooms.capacity,
        },
      })
      .from(timetable)
      .leftJoin(faculty, eq(timetable.facultyId, faculty.id))
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .leftJoin(classrooms, eq(timetable.classroomId, classrooms.id))
      .where(eq(timetable.id, timetableId))
      .limit(1);

    // Log activity
    await logActivity({
      actionType: 'TIMETABLE_MODIFIED',
      description: `Class modified: ${existing[0].subject?.name} on ${existing[0].dayOfWeek}`,
      referenceType: 'timetable',
      referenceId: timetableId,
      previousValue: JSON.stringify(existing[0]),
      newValue: JSON.stringify(completeUpdated[0]),
      severity: 'info',
    });

    return NextResponse.json(completeUpdated[0], { status: 200 });
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

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const timetableId = parseInt(id);

    // Check if entry exists and get joined data
    const existing = await db
      .select({
        id: timetable.id,
        dayOfWeek: timetable.dayOfWeek,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
        semester: timetable.semester,
        studentGroup: timetable.studentGroup,
        createdAt: timetable.createdAt,
        faculty: {
          name: faculty.name,
        },
        subject: {
          name: subjects.name,
        },
        classroom: {
          roomNumber: classrooms.roomNumber,
        },
      })
      .from(timetable)
      .leftJoin(faculty, eq(timetable.facultyId, faculty.id))
      .leftJoin(subjects, eq(timetable.subjectId, subjects.id))
      .leftJoin(classrooms, eq(timetable.classroomId, classrooms.id))
      .where(eq(timetable.id, timetableId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Timetable entry not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete the entry
    const deleted = await db
      .delete(timetable)
      .where(eq(timetable.id, timetableId))
      .returning();

    // Log activity
    await logActivity({
      actionType: 'TIMETABLE_DELETED',
      description: `Class removed: ${existing[0].subject?.name} on ${existing[0].dayOfWeek} at ${existing[0].startTime}`,
      referenceType: 'timetable',
      referenceId: existing[0].id,
      previousValue: JSON.stringify(existing[0]),
      severity: 'warning',
    });

    return NextResponse.json(
      {
        message: 'Timetable entry deleted successfully',
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