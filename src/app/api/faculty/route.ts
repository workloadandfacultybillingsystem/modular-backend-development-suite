import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faculty } from '@/db/schema';

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