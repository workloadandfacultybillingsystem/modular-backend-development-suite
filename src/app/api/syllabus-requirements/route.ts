import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { syllabusRequirements, subjects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subjectIdParam = searchParams.get('subjectId');
    const semesterParam = searchParams.get('semester');

    let query = db
      .select({
        id: syllabusRequirements.id,
        subjectId: syllabusRequirements.subjectId,
        semester: syllabusRequirements.semester,
        requiredLectureHours: syllabusRequirements.requiredLectureHours,
        requiredPracticalHours: syllabusRequirements.requiredPracticalHours,
        requiredTutorialHours: syllabusRequirements.requiredTutorialHours,
        totalWeeks: syllabusRequirements.totalWeeks,
        createdAt: syllabusRequirements.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          credits: subjects.credits,
        },
      })
      .from(syllabusRequirements)
      .leftJoin(subjects, eq(syllabusRequirements.subjectId, subjects.id));

    const conditions = [];
    if (subjectIdParam) {
      const subjectId = parseInt(subjectIdParam);
      if (isNaN(subjectId)) {
        return NextResponse.json(
          { error: 'Invalid subject ID', code: 'INVALID_SUBJECT_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(syllabusRequirements.subjectId, subjectId));
    }

    if (semesterParam) {
      conditions.push(eq(syllabusRequirements.semester, semesterParam));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;

    const formattedResults = results.map((row) => ({
      id: row.id,
      subjectId: row.subjectId,
      semester: row.semester,
      requiredLectureHours: row.requiredLectureHours,
      requiredPracticalHours: row.requiredPracticalHours,
      requiredTutorialHours: row.requiredTutorialHours,
      totalWeeks: row.totalWeeks,
      createdAt: row.createdAt,
      totalRequiredHours:
        row.requiredLectureHours +
        row.requiredPracticalHours +
        row.requiredTutorialHours,
      subject: row.subject,
    }));

    formattedResults.sort((a, b) => {
      const nameA = a.subject?.name || '';
      const nameB = b.subject?.name || '';
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json(formattedResults);
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
      subjectId,
      semester,
      requiredLectureHours,
      requiredPracticalHours,
      requiredTutorialHours,
      totalWeeks,
    } = body;

    if (!subjectId) {
      return NextResponse.json(
        { error: 'Subject ID is required', code: 'MISSING_SUBJECT_ID' },
        { status: 400 }
      );
    }

    if (!semester || semester.trim() === '') {
      return NextResponse.json(
        { error: 'Semester is required', code: 'MISSING_SEMESTER' },
        { status: 400 }
      );
    }

    if (requiredLectureHours === undefined || requiredLectureHours === null) {
      return NextResponse.json(
        {
          error: 'Required lecture hours is required',
          code: 'MISSING_LECTURE_HOURS',
        },
        { status: 400 }
      );
    }

    if (
      requiredPracticalHours === undefined ||
      requiredPracticalHours === null
    ) {
      return NextResponse.json(
        {
          error: 'Required practical hours is required',
          code: 'MISSING_PRACTICAL_HOURS',
        },
        { status: 400 }
      );
    }

    if (
      requiredTutorialHours === undefined ||
      requiredTutorialHours === null
    ) {
      return NextResponse.json(
        {
          error: 'Required tutorial hours is required',
          code: 'MISSING_TUTORIAL_HOURS',
        },
        { status: 400 }
      );
    }

    if (!totalWeeks) {
      return NextResponse.json(
        { error: 'Total weeks is required', code: 'MISSING_TOTAL_WEEKS' },
        { status: 400 }
      );
    }

    if (typeof subjectId !== 'number' || subjectId <= 0) {
      return NextResponse.json(
        { error: 'Subject ID must be a positive integer', code: 'INVALID_SUBJECT_ID' },
        { status: 400 }
      );
    }

    if (typeof requiredLectureHours !== 'number' || requiredLectureHours <= 0) {
      return NextResponse.json(
        {
          error: 'Required lecture hours must be a positive integer',
          code: 'INVALID_LECTURE_HOURS',
        },
        { status: 400 }
      );
    }

    if (
      typeof requiredPracticalHours !== 'number' ||
      requiredPracticalHours < 0
    ) {
      return NextResponse.json(
        {
          error: 'Required practical hours must be a non-negative integer',
          code: 'INVALID_PRACTICAL_HOURS',
        },
        { status: 400 }
      );
    }

    if (
      typeof requiredTutorialHours !== 'number' ||
      requiredTutorialHours < 0
    ) {
      return NextResponse.json(
        {
          error: 'Required tutorial hours must be a non-negative integer',
          code: 'INVALID_TUTORIAL_HOURS',
        },
        { status: 400 }
      );
    }

    if (typeof totalWeeks !== 'number' || totalWeeks <= 0) {
      return NextResponse.json(
        {
          error: 'Total weeks must be a positive integer',
          code: 'INVALID_TOTAL_WEEKS',
        },
        { status: 400 }
      );
    }

    const subjectExists = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (subjectExists.length === 0) {
      return NextResponse.json(
        { error: 'Subject not found', code: 'SUBJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const existingRequirement = await db
      .select()
      .from(syllabusRequirements)
      .where(
        and(
          eq(syllabusRequirements.subjectId, subjectId),
          eq(syllabusRequirements.semester, semester.trim())
        )
      )
      .limit(1);

    if (existingRequirement.length > 0) {
      return NextResponse.json(
        {
          error: `Syllabus requirement already exists for subject ID ${subjectId} in ${semester}`,
          code: 'DUPLICATE_REQUIREMENT',
        },
        { status: 400 }
      );
    }

    const newRequirement = await db
      .insert(syllabusRequirements)
      .values({
        subjectId,
        semester: semester.trim(),
        requiredLectureHours,
        requiredPracticalHours,
        requiredTutorialHours,
        totalWeeks,
        createdAt: new Date().toISOString(),
      })
      .returning();

    const createdWithSubject = await db
      .select({
        id: syllabusRequirements.id,
        subjectId: syllabusRequirements.subjectId,
        semester: syllabusRequirements.semester,
        requiredLectureHours: syllabusRequirements.requiredLectureHours,
        requiredPracticalHours: syllabusRequirements.requiredPracticalHours,
        requiredTutorialHours: syllabusRequirements.requiredTutorialHours,
        totalWeeks: syllabusRequirements.totalWeeks,
        createdAt: syllabusRequirements.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          credits: subjects.credits,
        },
      })
      .from(syllabusRequirements)
      .leftJoin(subjects, eq(syllabusRequirements.subjectId, subjects.id))
      .where(eq(syllabusRequirements.id, newRequirement[0].id))
      .limit(1);

    const result = {
      ...createdWithSubject[0],
      totalRequiredHours:
        createdWithSubject[0].requiredLectureHours +
        createdWithSubject[0].requiredPracticalHours +
        createdWithSubject[0].requiredTutorialHours,
    };

    return NextResponse.json(result, { status: 201 });
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const requirementId = parseInt(id);

    const existing = await db
      .select()
      .from(syllabusRequirements)
      .where(eq(syllabusRequirements.id, requirementId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Syllabus requirement not found', code: 'REQUIREMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      subjectId,
      semester,
      requiredLectureHours,
      requiredPracticalHours,
      requiredTutorialHours,
      totalWeeks,
    } = body;

    const updates: any = {};

    if (subjectId !== undefined) {
      if (typeof subjectId !== 'number' || subjectId <= 0) {
        return NextResponse.json(
          { error: 'Subject ID must be a positive integer', code: 'INVALID_SUBJECT_ID' },
          { status: 400 }
        );
      }

      const subjectExists = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, subjectId))
        .limit(1);

      if (subjectExists.length === 0) {
        return NextResponse.json(
          { error: 'Subject not found', code: 'SUBJECT_NOT_FOUND' },
          { status: 404 }
        );
      }

      updates.subjectId = subjectId;
    }

    if (semester !== undefined) {
      if (typeof semester !== 'string' || semester.trim() === '') {
        return NextResponse.json(
          { error: 'Semester must be a non-empty string', code: 'INVALID_SEMESTER' },
          { status: 400 }
        );
      }
      updates.semester = semester.trim();
    }

    if (requiredLectureHours !== undefined) {
      if (typeof requiredLectureHours !== 'number' || requiredLectureHours <= 0) {
        return NextResponse.json(
          {
            error: 'Required lecture hours must be a positive integer',
            code: 'INVALID_LECTURE_HOURS',
          },
          { status: 400 }
        );
      }
      updates.requiredLectureHours = requiredLectureHours;
    }

    if (requiredPracticalHours !== undefined) {
      if (
        typeof requiredPracticalHours !== 'number' ||
        requiredPracticalHours < 0
      ) {
        return NextResponse.json(
          {
            error: 'Required practical hours must be a non-negative integer',
            code: 'INVALID_PRACTICAL_HOURS',
          },
          { status: 400 }
        );
      }
      updates.requiredPracticalHours = requiredPracticalHours;
    }

    if (requiredTutorialHours !== undefined) {
      if (
        typeof requiredTutorialHours !== 'number' ||
        requiredTutorialHours < 0
      ) {
        return NextResponse.json(
          {
            error: 'Required tutorial hours must be a non-negative integer',
            code: 'INVALID_TUTORIAL_HOURS',
          },
          { status: 400 }
        );
      }
      updates.requiredTutorialHours = requiredTutorialHours;
    }

    if (totalWeeks !== undefined) {
      if (typeof totalWeeks !== 'number' || totalWeeks <= 0) {
        return NextResponse.json(
          {
            error: 'Total weeks must be a positive integer',
            code: 'INVALID_TOTAL_WEEKS',
          },
          { status: 400 }
        );
      }
      updates.totalWeeks = totalWeeks;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update', code: 'NO_UPDATES' },
        { status: 400 }
      );
    }

    await db
      .update(syllabusRequirements)
      .set(updates)
      .where(eq(syllabusRequirements.id, requirementId))
      .returning();

    const updatedWithSubject = await db
      .select({
        id: syllabusRequirements.id,
        subjectId: syllabusRequirements.subjectId,
        semester: syllabusRequirements.semester,
        requiredLectureHours: syllabusRequirements.requiredLectureHours,
        requiredPracticalHours: syllabusRequirements.requiredPracticalHours,
        requiredTutorialHours: syllabusRequirements.requiredTutorialHours,
        totalWeeks: syllabusRequirements.totalWeeks,
        createdAt: syllabusRequirements.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          credits: subjects.credits,
        },
      })
      .from(syllabusRequirements)
      .leftJoin(subjects, eq(syllabusRequirements.subjectId, subjects.id))
      .where(eq(syllabusRequirements.id, requirementId))
      .limit(1);

    const result = {
      ...updatedWithSubject[0],
      totalRequiredHours:
        updatedWithSubject[0].requiredLectureHours +
        updatedWithSubject[0].requiredPracticalHours +
        updatedWithSubject[0].requiredTutorialHours,
    };

    return NextResponse.json(result);
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const requirementId = parseInt(id);

    const existing = await db
      .select({
        id: syllabusRequirements.id,
        subjectId: syllabusRequirements.subjectId,
        semester: syllabusRequirements.semester,
        requiredLectureHours: syllabusRequirements.requiredLectureHours,
        requiredPracticalHours: syllabusRequirements.requiredPracticalHours,
        requiredTutorialHours: syllabusRequirements.requiredTutorialHours,
        totalWeeks: syllabusRequirements.totalWeeks,
        createdAt: syllabusRequirements.createdAt,
        subject: {
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          credits: subjects.credits,
        },
      })
      .from(syllabusRequirements)
      .leftJoin(subjects, eq(syllabusRequirements.subjectId, subjects.id))
      .where(eq(syllabusRequirements.id, requirementId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Syllabus requirement not found', code: 'REQUIREMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    await db
      .delete(syllabusRequirements)
      .where(eq(syllabusRequirements.id, requirementId))
      .returning();

    const deletedRecord = {
      ...existing[0],
      totalRequiredHours:
        existing[0].requiredLectureHours +
        existing[0].requiredPracticalHours +
        existing[0].requiredTutorialHours,
    };

    return NextResponse.json({
      message: 'Syllabus requirement deleted successfully',
      deletedRecord,
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}