"use client";

import { useEffect, useState } from "react";
import { Bell, X, Check, AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Notification {
  id: number;
  title: string;
  message: string;
  notificationType: "info" | "warning" | "conflict" | "approval_required" | "system";
  severity: "low" | "medium" | "high" | "critical";
  targetUserType: "faculty" | "admin" | "all";
  isRead: boolean;
  sentAt: string;
  createdAt: string;
  referenceType?: string;
  referenceId?: number;
}

interface NotificationListProps {
  onUpdate?: () => void;
}

export const NotificationList = ({ onUpdate }: NotificationListProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications?limit=20");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications?id=${id}`, {
        method: "PUT",
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        );
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserType: "all" }),
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, isRead: true }))
        );
        onUpdate?.();
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationIcon = (type: Notification["notificationType"]) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "conflict":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "approval_required":
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case "system":
        return <Bell className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: Notification["severity"]) => {
    switch (severity) {
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Notifications</h3>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Loading notifications...
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div className="flex flex-col h-[500px]">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-lg">Notifications</h3>
        {unreadNotifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="text-center py-12 px-4 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 transition-colors ${
                  !notification.isRead ? "bg-muted/30" : ""
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notificationType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getSeverityColor(notification.severity)}`}
                      >
                        {notification.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.sentAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t">
        <Link href="/notifications">
          <Button variant="ghost" className="w-full" size="sm">
            View all notifications
          </Button>
        </Link>
      </div>
    </div>
  );
};
