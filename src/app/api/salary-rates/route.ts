import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salaryRates, faculty } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('facultyId');

    if (facultyId) {
      const id = parseInt(facultyId);
      if (isNaN(id)) {
        return NextResponse.json({ 
          error: "Valid faculty ID is required",
          code: "INVALID_FACULTY_ID" 
        }, { status: 400 });
      }

      const result = await db.select({
        id: salaryRates.id,
        facultyId: salaryRates.facultyId,
        lectureRatePerHour: salaryRates.lectureRatePerHour,
        practicalRatePerHour: salaryRates.practicalRatePerHour,
        tutorialRatePerHour: salaryRates.tutorialRatePerHour,
        extraClassBonus: salaryRates.extraClassBonus,
        makeupClassBonus: salaryRates.makeupClassBonus,
        createdAt: salaryRates.createdAt,
        updatedAt: salaryRates.updatedAt,
        faculty: {
          id: faculty.id,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department
        }
      })
        .from(salaryRates)
        .leftJoin(faculty, eq(salaryRates.facultyId, faculty.id))
        .where(eq(salaryRates.facultyId, id))
        .limit(1);

      if (result.length === 0) {
        return NextResponse.json({ 
          error: 'Salary rate not found for this faculty',
          code: "SALARY_RATE_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(result[0], { status: 200 });
    }

    const results = await db.select({
      id: salaryRates.id,
      facultyId: salaryRates.facultyId,
      lectureRatePerHour: salaryRates.lectureRatePerHour,
      practicalRatePerHour: salaryRates.practicalRatePerHour,
      tutorialRatePerHour: salaryRates.tutorialRatePerHour,
      extraClassBonus: salaryRates.extraClassBonus,
      makeupClassBonus: salaryRates.makeupClassBonus,
      createdAt: salaryRates.createdAt,
      updatedAt: salaryRates.updatedAt,
      faculty: {
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department
      }
    })
      .from(salaryRates)
      .leftJoin(faculty, eq(salaryRates.facultyId, faculty.id));

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
      facultyId, 
      lectureRatePerHour, 
      practicalRatePerHour, 
      tutorialRatePerHour, 
      extraClassBonus, 
      makeupClassBonus 
    } = body;

    if (!facultyId) {
      return NextResponse.json({ 
        error: "Faculty ID is required",
        code: "MISSING_FACULTY_ID" 
      }, { status: 400 });
    }

    if (!lectureRatePerHour) {
      return NextResponse.json({ 
        error: "Lecture rate per hour is required",
        code: "MISSING_LECTURE_RATE" 
      }, { status: 400 });
    }

    if (!practicalRatePerHour) {
      return NextResponse.json({ 
        error: "Practical rate per hour is required",
        code: "MISSING_PRACTICAL_RATE" 
      }, { status: 400 });
    }

    if (!tutorialRatePerHour) {
      return NextResponse.json({ 
        error: "Tutorial rate per hour is required",
        code: "MISSING_TUTORIAL_RATE" 
      }, { status: 400 });
    }

    if (extraClassBonus === undefined || extraClassBonus === null) {
      return NextResponse.json({ 
        error: "Extra class bonus is required",
        code: "MISSING_EXTRA_CLASS_BONUS" 
      }, { status: 400 });
    }

    if (makeupClassBonus === undefined || makeupClassBonus === null) {
      return NextResponse.json({ 
        error: "Makeup class bonus is required",
        code: "MISSING_MAKEUP_CLASS_BONUS" 
      }, { status: 400 });
    }

    const parsedFacultyId = parseInt(facultyId);
    const parsedLectureRate = parseInt(lectureRatePerHour);
    const parsedPracticalRate = parseInt(practicalRatePerHour);
    const parsedTutorialRate = parseInt(tutorialRatePerHour);
    const parsedExtraBonus = parseInt(extraClassBonus);
    const parsedMakeupBonus = parseInt(makeupClassBonus);

    if (isNaN(parsedFacultyId)) {
      return NextResponse.json({ 
        error: "Faculty ID must be a valid integer",
        code: "INVALID_FACULTY_ID" 
      }, { status: 400 });
    }

    if (isNaN(parsedLectureRate) || parsedLectureRate <= 0) {
      return NextResponse.json({ 
        error: "Lecture rate per hour must be a positive integer",
        code: "INVALID_LECTURE_RATE" 
      }, { status: 400 });
    }

    if (isNaN(parsedPracticalRate) || parsedPracticalRate <= 0) {
      return NextResponse.json({ 
        error: "Practical rate per hour must be a positive integer",
        code: "INVALID_PRACTICAL_RATE" 
      }, { status: 400 });
    }

    if (isNaN(parsedTutorialRate) || parsedTutorialRate <= 0) {
      return NextResponse.json({ 
        error: "Tutorial rate per hour must be a positive integer",
        code: "INVALID_TUTORIAL_RATE" 
      }, { status: 400 });
    }

    if (isNaN(parsedExtraBonus) || parsedExtraBonus < 0 || parsedExtraBonus > 100) {
      return NextResponse.json({ 
        error: "Extra class bonus must be a non-negative integer between 0 and 100",
        code: "INVALID_EXTRA_CLASS_BONUS" 
      }, { status: 400 });
    }

    if (isNaN(parsedMakeupBonus) || parsedMakeupBonus < 0 || parsedMakeupBonus > 100) {
      return NextResponse.json({ 
        error: "Makeup class bonus must be a non-negative integer between 0 and 100",
        code: "INVALID_MAKEUP_CLASS_BONUS" 
      }, { status: 400 });
    }

    const facultyExists = await db.select()
      .from(faculty)
      .where(eq(faculty.id, parsedFacultyId))
      .limit(1);

    if (facultyExists.length === 0) {
      return NextResponse.json({ 
        error: "Faculty not found",
        code: "FACULTY_NOT_FOUND" 
      }, { status: 404 });
    }

    const existingSalaryRate = await db.select()
      .from(salaryRates)
      .where(eq(salaryRates.facultyId, parsedFacultyId))
      .limit(1);

    if (existingSalaryRate.length > 0) {
      const updated = await db.update(salaryRates)
        .set({
          lectureRatePerHour: parsedLectureRate,
          practicalRatePerHour: parsedPracticalRate,
          tutorialRatePerHour: parsedTutorialRate,
          extraClassBonus: parsedExtraBonus,
          makeupClassBonus: parsedMakeupBonus,
          updatedAt: new Date().toISOString()
        })
        .where(eq(salaryRates.facultyId, parsedFacultyId))
        .returning();

      return NextResponse.json(updated[0], { status: 200 });
    }

    const newSalaryRate = await db.insert(salaryRates)
      .values({
        facultyId: parsedFacultyId,
        lectureRatePerHour: parsedLectureRate,
        practicalRatePerHour: parsedPracticalRate,
        tutorialRatePerHour: parsedTutorialRate,
        extraClassBonus: parsedExtraBonus,
        makeupClassBonus: parsedMakeupBonus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newSalaryRate[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const parsedId = parseInt(id);

    const existingRecord = await db.select()
      .from(salaryRates)
      .where(eq(salaryRates.id, parsedId))
      .limit(1);

    if (existingRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Salary rate not found',
        code: "SALARY_RATE_NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (body.lectureRatePerHour !== undefined) {
      const rate = parseInt(body.lectureRatePerHour);
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json({ 
          error: "Lecture rate per hour must be a positive integer",
          code: "INVALID_LECTURE_RATE" 
        }, { status: 400 });
      }
      updates.lectureRatePerHour = rate;
    }

    if (body.practicalRatePerHour !== undefined) {
      const rate = parseInt(body.practicalRatePerHour);
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json({ 
          error: "Practical rate per hour must be a positive integer",
          code: "INVALID_PRACTICAL_RATE" 
        }, { status: 400 });
      }
      updates.practicalRatePerHour = rate;
    }

    if (body.tutorialRatePerHour !== undefined) {
      const rate = parseInt(body.tutorialRatePerHour);
      if (isNaN(rate) || rate <= 0) {
        return NextResponse.json({ 
          error: "Tutorial rate per hour must be a positive integer",
          code: "INVALID_TUTORIAL_RATE" 
        }, { status: 400 });
      }
      updates.tutorialRatePerHour = rate;
    }

    if (body.extraClassBonus !== undefined) {
      const bonus = parseInt(body.extraClassBonus);
      if (isNaN(bonus) || bonus < 0 || bonus > 100) {
        return NextResponse.json({ 
          error: "Extra class bonus must be a non-negative integer between 0 and 100",
          code: "INVALID_EXTRA_CLASS_BONUS" 
        }, { status: 400 });
      }
      updates.extraClassBonus = bonus;
    }

    if (body.makeupClassBonus !== undefined) {
      const bonus = parseInt(body.makeupClassBonus);
      if (isNaN(bonus) || bonus < 0 || bonus > 100) {
        return NextResponse.json({ 
          error: "Makeup class bonus must be a non-negative integer between 0 and 100",
          code: "INVALID_MAKEUP_CLASS_BONUS" 
        }, { status: 400 });
      }
      updates.makeupClassBonus = bonus;
    }

    if (body.facultyId !== undefined) {
      const fid = parseInt(body.facultyId);
      if (isNaN(fid)) {
        return NextResponse.json({ 
          error: "Faculty ID must be a valid integer",
          code: "INVALID_FACULTY_ID" 
        }, { status: 400 });
      }

      const facultyExists = await db.select()
        .from(faculty)
        .where(eq(faculty.id, fid))
        .limit(1);

      if (facultyExists.length === 0) {
        return NextResponse.json({ 
          error: "Faculty not found",
          code: "FACULTY_NOT_FOUND" 
        }, { status: 404 });
      }

      updates.facultyId = fid;
    }

    const updated = await db.update(salaryRates)
      .set(updates)
      .where(eq(salaryRates.id, parsedId))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}