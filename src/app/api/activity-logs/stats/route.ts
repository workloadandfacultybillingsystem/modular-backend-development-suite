import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activityLogs } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get total count of all logs
    const totalLogsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(activityLogs);
    const totalLogs = totalLogsResult[0]?.count || 0;

    // Get counts by action type
    const byActionTypeResult = await db
      .select({
        actionType: activityLogs.actionType,
        count: sql<number>`COUNT(*)`
      })
      .from(activityLogs)
      .groupBy(activityLogs.actionType)
      .orderBy(activityLogs.actionType);

    const byActionType: Record<string, number> = {};
    byActionTypeResult.forEach(row => {
      byActionType[row.actionType] = row.count;
    });

    // Get counts by severity
    const bySeverityResult = await db
      .select({
        severity: activityLogs.severity,
        count: sql<number>`COUNT(*)`
      })
      .from(activityLogs)
      .groupBy(activityLogs.severity);

    const bySeverity: Record<string, number> = {};
    bySeverityResult.forEach(row => {
      bySeverity[row.severity] = row.count;
    });

    // Get counts by user (top 10)
    const byUserResult = await db
      .select({
        userId: activityLogs.userId,
        userName: activityLogs.userName,
        count: sql<number>`COUNT(*)`
      })
      .from(activityLogs)
      .where(sql`${activityLogs.userId} IS NOT NULL`)
      .groupBy(activityLogs.userId, activityLogs.userName)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    const byUser = byUserResult.map(row => ({
      userId: row.userId || '',
      userName: row.userName || '',
      count: row.count
    }));

    // Get counts by day for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

    const byDayResult = await db
      .select({
        date: sql<string>`DATE(${activityLogs.timestamp})`,
        count: sql<number>`COUNT(*)`
      })
      .from(activityLogs)
      .where(sql`${activityLogs.timestamp} >= ${thirtyDaysAgoISO}`)
      .groupBy(sql`DATE(${activityLogs.timestamp})`)
      .orderBy(sql`DATE(${activityLogs.timestamp}) DESC`);

    const byDay = byDayResult.map(row => ({
      date: row.date,
      count: row.count
    }));

    // Get system vs user actions count
    const systemActionsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(activityLogs)
      .where(sql`${activityLogs.isSystemAction} = 1`);
    const systemActions = systemActionsResult[0]?.count || 0;

    const userActionsResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(activityLogs)
      .where(sql`${activityLogs.isSystemAction} = 0`);
    const userActions = userActionsResult[0]?.count || 0;

    const systemVsUser = {
      systemActions,
      userActions
    };

    return NextResponse.json({
      totalLogs,
      byActionType,
      bySeverity,
      byUser,
      byDay,
      systemVsUser
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}