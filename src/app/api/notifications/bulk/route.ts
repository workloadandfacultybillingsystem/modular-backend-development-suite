import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';

const VALID_NOTIFICATION_TYPES = ['info', 'warning', 'conflict', 'approval_required', 'system'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_TARGET_USER_TYPES = ['faculty', 'admin', 'all'];

interface NotificationInput {
  title: string;
  message: string;
  notificationType: string;
  severity: string;
  targetUserType: string;
  targetUserId?: number;
  referenceType?: string;
  referenceId?: number;
  metadata?: string;
  isRead?: boolean;
  isSent?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notifications: notificationsArray } = body;

    // Validate notifications array exists and is an array
    if (!notificationsArray) {
      return NextResponse.json(
        { 
          error: 'Notifications array is required',
          code: 'MISSING_NOTIFICATIONS_ARRAY' 
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(notificationsArray)) {
      return NextResponse.json(
        { 
          error: 'Notifications must be an array',
          code: 'INVALID_NOTIFICATIONS_TYPE' 
        },
        { status: 400 }
      );
    }

    // Validate array length
    if (notificationsArray.length === 0) {
      return NextResponse.json(
        { 
          error: 'Notifications array cannot be empty',
          code: 'EMPTY_NOTIFICATIONS_ARRAY' 
        },
        { status: 400 }
      );
    }

    if (notificationsArray.length > 100) {
      return NextResponse.json(
        { 
          error: 'Maximum 100 notifications allowed per request',
          code: 'NOTIFICATIONS_LIMIT_EXCEEDED' 
        },
        { status: 400 }
      );
    }

    // Validate each notification
    const validatedNotifications: any[] = [];
    const currentTimestamp = new Date().toISOString();

    for (let i = 0; i < notificationsArray.length; i++) {
      const notification = notificationsArray[i] as NotificationInput;
      const index = i + 1;

      // Validate required fields
      if (!notification.title || typeof notification.title !== 'string' || notification.title.trim() === '') {
        return NextResponse.json(
          { 
            error: `Notification at index ${index}: title is required and must be a non-empty string`,
            code: 'INVALID_TITLE',
            index 
          },
          { status: 400 }
        );
      }

      if (!notification.message || typeof notification.message !== 'string' || notification.message.trim() === '') {
        return NextResponse.json(
          { 
            error: `Notification at index ${index}: message is required and must be a non-empty string`,
            code: 'INVALID_MESSAGE',
            index 
          },
          { status: 400 }
        );
      }

      if (!notification.notificationType || !VALID_NOTIFICATION_TYPES.includes(notification.notificationType)) {
        return NextResponse.json(
          { 
            error: `Notification at index ${index}: notificationType must be one of: ${VALID_NOTIFICATION_TYPES.join(', ')}`,
            code: 'INVALID_NOTIFICATION_TYPE',
            index 
          },
          { status: 400 }
        );
      }

      if (!notification.severity || !VALID_SEVERITIES.includes(notification.severity)) {
        return NextResponse.json(
          { 
            error: `Notification at index ${index}: severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
            code: 'INVALID_SEVERITY',
            index 
          },
          { status: 400 }
        );
      }

      if (!notification.targetUserType || !VALID_TARGET_USER_TYPES.includes(notification.targetUserType)) {
        return NextResponse.json(
          { 
            error: `Notification at index ${index}: targetUserType must be one of: ${VALID_TARGET_USER_TYPES.join(', ')}`,
            code: 'INVALID_TARGET_USER_TYPE',
            index 
          },
          { status: 400 }
        );
      }

      // Validate optional integer fields
      if (notification.targetUserId !== undefined && notification.targetUserId !== null) {
        if (!Number.isInteger(notification.targetUserId)) {
          return NextResponse.json(
            { 
              error: `Notification at index ${index}: targetUserId must be an integer`,
              code: 'INVALID_TARGET_USER_ID',
              index 
            },
            { status: 400 }
          );
        }
      }

      if (notification.referenceId !== undefined && notification.referenceId !== null) {
        if (!Number.isInteger(notification.referenceId)) {
          return NextResponse.json(
            { 
              error: `Notification at index ${index}: referenceId must be an integer`,
              code: 'INVALID_REFERENCE_ID',
              index 
            },
            { status: 400 }
          );
        }
      }

      // Validate metadata is valid JSON if provided
      if (notification.metadata !== undefined && notification.metadata !== null) {
        if (typeof notification.metadata !== 'string') {
          return NextResponse.json(
            { 
              error: `Notification at index ${index}: metadata must be a string`,
              code: 'INVALID_METADATA_TYPE',
              index 
            },
            { status: 400 }
          );
        }

        if (notification.metadata.trim() !== '') {
          try {
            JSON.parse(notification.metadata);
          } catch (error) {
            return NextResponse.json(
              { 
                error: `Notification at index ${index}: metadata must be valid JSON`,
                code: 'INVALID_METADATA_JSON',
                index 
              },
              { status: 400 }
            );
          }
        }
      }

      // Build validated notification object
      const validatedNotification = {
        title: notification.title.trim(),
        message: notification.message.trim(),
        notificationType: notification.notificationType,
        severity: notification.severity,
        targetUserType: notification.targetUserType,
        targetUserId: notification.targetUserId ?? null,
        referenceType: notification.referenceType?.trim() || null,
        referenceId: notification.referenceId ?? null,
        metadata: notification.metadata?.trim() || null,
        isRead: notification.isRead ?? false,
        isSent: notification.isSent ?? true,
        sentAt: currentTimestamp,
        readAt: null,
        createdAt: currentTimestamp,
      };

      validatedNotifications.push(validatedNotification);
    }

    // Bulk insert all validated notifications
    const createdNotifications = await db.insert(notifications)
      .values(validatedNotifications)
      .returning();

    return NextResponse.json(
      {
        message: `${createdNotifications.length} notifications created successfully`,
        count: createdNotifications.length,
        notifications: createdNotifications,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('POST bulk notifications error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error.message,
        code: 'INTERNAL_SERVER_ERROR' 
      },
      { status: 500 }
    );
  }
}