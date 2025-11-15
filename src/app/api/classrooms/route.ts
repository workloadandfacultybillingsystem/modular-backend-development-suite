import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { classrooms } from '@/db/schema';

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