"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Users,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  Search,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  History
} from 'lucide-react'

interface ActivityLog {
  id: number
  actionType: string
  userId: string | null
  userName: string | null
  timestamp: string
  description: string
  referenceType: string | null
  referenceId: number | null
  previousValue: string | null
  newValue: string | null
  metadata: string | null
  severity: string
  isSystemAction: boolean
  createdAt: string
}

interface ActivityStats {
  totalLogs: number
  byActionType: Record<string, number>
  bySeverity: Record<string, number>
  byUser: Array<{ userId: string; userName: string; count: number }>
  byDay: Array<{ date: string; count: number }>
  systemVsUser: {
    systemActions: number
    userActions: number
  }
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  useEffect(() => {
    fetchActivityLogs()
    fetchStats()
  }, [])

  const fetchActivityLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/activity-logs?limit=100')
      if (!response.ok) throw new Error('Failed to fetch activity logs')
      const data = await response.json()
      setLogs(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/activity-logs/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    }
    return variants[severity] || variants.info
  }

  const getActionTypeIcon = (actionType: string) => {
    if (actionType.includes('FACULTY')) return <Users className="w-4 h-4" />
    if (actionType.includes('SUBJECT')) return <BookOpen className="w-4 h-4" />
    if (actionType.includes('CLASSROOM')) return <Building2 className="w-4 h-4" />
    if (actionType.includes('TIMETABLE')) return <Calendar className="w-4 h-4" />
    if (actionType.includes('CONFLICT')) return <AlertCircle className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupLogsByDay = (logs: ActivityLog[]) => {
    const grouped: Record<string, ActivityLog[]> = {}
    logs.forEach(log => {
      const date = formatDate(log.timestamp)
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(log)
    })
    return grouped
  }

  const filteredLogs = logs.filter(log => {
    if (actionTypeFilter && log.actionType !== actionTypeFilter) return false
    if (severityFilter && log.severity !== severityFilter) return false
    if (searchTerm && !log.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const groupedLogs = groupLogsByDay(filteredLogs)

  const uniqueActionTypes = Array.from(new Set(logs.map(log => log.actionType))).sort()

  const toggleExpand = (logId: number) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <History className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              Activity Logs
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Complete audit trail of all system actions
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Activity className="w-4 h-4 mr-2" />
              {logs.length} Total Logs
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Feed
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Activity Feed Tab */}
          <TabsContent value="logs" className="mt-6 space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <Label htmlFor="search" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Search Description
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search activity logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Action Type Filter */}
                  <div className="space-y-2">
                    <Label>Action Type</Label>
                    <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All action types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All action types</SelectItem>
                        {uniqueActionTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All severities</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(actionTypeFilter || severityFilter || searchTerm) && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary">{filteredLogs.length} results</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActionTypeFilter('')
                        setSeverityFilter('')
                        setSearchTerm('')
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Logs Grouped by Day */}
            {Object.entries(groupedLogs).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">No activity logs found</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedLogs).map(([date, dayLogs]) => (
                <Card key={date}>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      {date}
                    </CardTitle>
                    <CardDescription>{dayLogs.length} activities</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {dayLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border transition-all ${
                            log.severity === 'error'
                              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                              : log.severity === 'warning'
                              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
                              : log.severity === 'success'
                              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {getSeverityIcon(log.severity)}
                                <Badge className={getSeverityBadge(log.severity)}>
                                  {log.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  {getActionTypeIcon(log.actionType)}
                                  {log.actionType.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(log.timestamp)}
                                </span>
                                {log.isSystemAction && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Activity className="w-3 h-3 mr-1" />
                                    System
                                  </Badge>
                                )}
                              </div>

                              <p className="text-slate-900 dark:text-white font-medium mb-2">
                                {log.description}
                              </p>

                              {log.userName && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  By: {log.userName}
                                </p>
                              )}

                              {/* Expandable Details */}
                              {(log.previousValue || log.newValue || log.metadata) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(log.id)}
                                  className="mt-2 text-xs"
                                >
                                  {expandedLog === log.id ? (
                                    <>
                                      <ChevronUp className="w-3 h-3 mr-1" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                      Show Details
                                    </>
                                  )}
                                </Button>
                              )}

                              {expandedLog === log.id && (
                                <div className="mt-4 space-y-3 text-sm">
                                  {log.previousValue && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Previous Value:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.previousValue), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.newValue && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        New Value:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.metadata && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Metadata:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.referenceType && log.referenceId && (
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold">Reference:</span>
                                      <Badge variant="outline">
                                        {log.referenceType} #{log.referenceId}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="mt-6 space-y-6">
            {stats && (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Activities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.totalLogs}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        All time activity logs
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        User Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.systemVsUser.userActions}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Manual operations
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        System Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {stats.systemVsUser.systemActions}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Automated operations
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* By Action Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Activities by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byActionType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {getActionTypeIcon(type)}
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                                  style={{
                                    width: `${(count / stats.totalLogs) * 100}%`,
                                  }}
                                />
                              </div>
                              <Badge variant="secondary" className="min-w-[60px] justify-center">
                                {count}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Severity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Activities by Severity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(stats.bySeverity).map(([severity, count]) => (
                        <Card key={severity} className="border-2">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              {getSeverityIcon(severity)}
                              <span className="text-sm font-semibold capitalize">
                                {severity}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              {count}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Most Active Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.byUser.slice(0, 10).map((user, index) => (
                        <div key={user.userId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {user.userName}
                            </span>
                          </div>
                          <Badge variant="outline">{user.count} activities</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Recent Activity Trend (Last 30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.byDay.slice(0, 15).map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {day.date}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.min((day.count / 20) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <Badge variant="secondary" className="min-w-[50px] justify-center">
                              {day.count}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Users,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  Search,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  History
} from 'lucide-react'

interface ActivityLog {
  id: number
  actionType: string
  userId: string | null
  userName: string | null
  timestamp: string
  description: string
  referenceType: string | null
  referenceId: number | null
  previousValue: string | null
  newValue: string | null
  metadata: string | null
  severity: string
  isSystemAction: boolean
  createdAt: string
}

interface ActivityStats {
  totalLogs: number
  byActionType: Record<string, number>
  bySeverity: Record<string, number>
  byUser: Array<{ userId: string; userName: string; count: number }>
  byDay: Array<{ date: string; count: number }>
  systemVsUser: {
    systemActions: number
    userActions: number
  }
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  useEffect(() => {
    fetchActivityLogs()
    fetchStats()
  }, [])

  const fetchActivityLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/activity-logs?limit=100')
      if (!response.ok) throw new Error('Failed to fetch activity logs')
      const data = await response.json()
      setLogs(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/activity-logs/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    }
    return variants[severity] || variants.info
  }

  const getActionTypeIcon = (actionType: string) => {
    if (actionType.includes('FACULTY')) return <Users className="w-4 h-4" />
    if (actionType.includes('SUBJECT')) return <BookOpen className="w-4 h-4" />
    if (actionType.includes('CLASSROOM')) return <Building2 className="w-4 h-4" />
    if (actionType.includes('TIMETABLE')) return <Calendar className="w-4 h-4" />
    if (actionType.includes('CONFLICT')) return <AlertCircle className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupLogsByDay = (logs: ActivityLog[]) => {
    const grouped: Record<string, ActivityLog[]> = {}
    logs.forEach(log => {
      const date = formatDate(log.timestamp)
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(log)
    })
    return grouped
  }

  const filteredLogs = logs.filter(log => {
    if (actionTypeFilter !== 'all' && log.actionType !== actionTypeFilter) return false
    if (severityFilter !== 'all' && log.severity !== severityFilter) return false
    if (searchTerm && !log.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const groupedLogs = groupLogsByDay(filteredLogs)

  const uniqueActionTypes = Array.from(new Set(logs.map(log => log.actionType))).sort()

  const toggleExpand = (logId: number) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <History className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              Activity Logs
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Complete audit trail of all system actions
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Activity className="w-4 h-4 mr-2" />
              {logs.length} Total Logs
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Feed
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Activity Feed Tab */}
          <TabsContent value="logs" className="mt-6 space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <Label htmlFor="search" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Search Description
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search activity logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Action Type Filter */}
                  <div className="space-y-2">
                    <Label>Action Type</Label>
                    <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All action types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All action types</SelectItem>
                        {uniqueActionTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All severities</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(actionTypeFilter || severityFilter || searchTerm) && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary">{filteredLogs.length} results</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActionTypeFilter('')
                        setSeverityFilter('')
                        setSearchTerm('')
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Logs Grouped by Day */}
            {Object.entries(groupedLogs).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">No activity logs found</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedLogs).map(([date, dayLogs]) => (
                <Card key={date}>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      {date}
                    </CardTitle>
                    <CardDescription>{dayLogs.length} activities</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {dayLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border transition-all ${
                            log.severity === 'error'
                              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                              : log.severity === 'warning'
                              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
                              : log.severity === 'success'
                              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {getSeverityIcon(log.severity)}
                                <Badge className={getSeverityBadge(log.severity)}>
                                  {log.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  {getActionTypeIcon(log.actionType)}
                                  {log.actionType.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(log.timestamp)}
                                </span>
                                {log.isSystemAction && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Activity className="w-3 h-3 mr-1" />
                                    System
                                  </Badge>
                                )}
                              </div>

                              <p className="text-slate-900 dark:text-white font-medium mb-2">
                                {log.description}
                              </p>

                              {log.userName && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  By: {log.userName}
                                </p>
                              )}

                              {/* Expandable Details */}
                              {(log.previousValue || log.newValue || log.metadata) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(log.id)}
                                  className="mt-2 text-xs"
                                >
                                  {expandedLog === log.id ? (
                                    <>
                                      <ChevronUp className="w-3 h-3 mr-1" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                      Show Details
                                    </>
                                  )}
                                </Button>
                              )}

                              {expandedLog === log.id && (
                                <div className="mt-4 space-y-3 text-sm">
                                  {log.previousValue && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Previous Value:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.previousValue), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.newValue && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        New Value:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.metadata && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Metadata:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.referenceType && log.referenceId && (
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold">Reference:</span>
                                      <Badge variant="outline">
                                        {log.referenceType} #{log.referenceId}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="mt-6 space-y-6">
            {stats && (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Activities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.totalLogs}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        All time activity logs
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        User Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.systemVsUser.userActions}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Manual operations
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        System Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {stats.systemVsUser.systemActions}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Automated operations
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* By Action Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Activities by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byActionType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {getActionTypeIcon(type)}
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                                  style={{
                                    width: `${(count / stats.totalLogs) * 100}%`,
                                  }}
                                />
                              </div>
                              <Badge variant="secondary" className="min-w-[60px] justify-center">
                                {count}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Severity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Activities by Severity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(stats.bySeverity).map(([severity, count]) => (
                        <Card key={severity} className="border-2">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              {getSeverityIcon(severity)}
                              <span className="text-sm font-semibold capitalize">
                                {severity}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              {count}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Most Active Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.byUser.slice(0, 10).map((user, index) => (
                        <div key={user.userId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {user.userName}
                            </span>
                          </div>
                          <Badge variant="outline">{user.count} activities</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Recent Activity Trend (Last 30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.byDay.slice(0, 15).map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {day.date}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.min((day.count / 20) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <Badge variant="secondary" className="min-w-[50px] justify-center">
                              {day.count}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Users,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  Search,
  AlertTriangle,
  Info,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  History
} from 'lucide-react'

interface ActivityLog {
  id: number
  actionType: string
  userId: string | null
  userName: string | null
  timestamp: string
  description: string
  referenceType: string | null
  referenceId: number | null
  previousValue: string | null
  newValue: string | null
  metadata: string | null
  severity: string
  isSystemAction: boolean
  createdAt: string
}

interface ActivityStats {
  totalLogs: number
  byActionType: Record<string, number>
  bySeverity: Record<string, number>
  byUser: Array<{ userId: string; userName: string; count: number }>
  byDay: Array<{ date: string; count: number }>
  systemVsUser: {
    systemActions: number
    userActions: number
  }
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('')
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedLog, setExpandedLog] = useState<number | null>(null)

  useEffect(() => {
    fetchActivityLogs()
    fetchStats()
  }, [])

  const fetchActivityLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/activity-logs?limit=100')
      if (!response.ok) throw new Error('Failed to fetch activity logs')
      const data = await response.json()
      setLogs(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/activity-logs/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
    }
    return variants[severity] || variants.info
  }

  const getActionTypeIcon = (actionType: string) => {
    if (actionType.includes('FACULTY')) return <Users className="w-4 h-4" />
    if (actionType.includes('SUBJECT')) return <BookOpen className="w-4 h-4" />
    if (actionType.includes('CLASSROOM')) return <Building2 className="w-4 h-4" />
    if (actionType.includes('TIMETABLE')) return <Calendar className="w-4 h-4" />
    if (actionType.includes('CONFLICT')) return <AlertCircle className="w-4 h-4" />
    return <Activity className="w-4 h-4" />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupLogsByDay = (logs: ActivityLog[]) => {
    const grouped: Record<string, ActivityLog[]> = {}
    logs.forEach(log => {
      const date = formatDate(log.timestamp)
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(log)
    })
    return grouped
  }

  const filteredLogs = logs.filter(log => {
    if (actionTypeFilter && log.actionType !== actionTypeFilter) return false
    if (severityFilter && log.severity !== severityFilter) return false
    if (searchTerm && !log.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const groupedLogs = groupLogsByDay(filteredLogs)

  const uniqueActionTypes = Array.from(new Set(logs.map(log => log.actionType))).sort()

  const toggleExpand = (logId: number) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <History className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              Activity Logs
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Complete audit trail of all system actions
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-sm px-4 py-2">
              <Activity className="w-4 h-4 mr-2" />
              {logs.length} Total Logs
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Feed
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistics
            </TabsTrigger>
          </TabsList>

          {/* Activity Feed Tab */}
          <TabsContent value="logs" className="mt-6 space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <Label htmlFor="search" className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Search Description
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search activity logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Action Type Filter */}
                  <div className="space-y-2">
                    <Label>Action Type</Label>
                    <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All action types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All action types</SelectItem>
                        {uniqueActionTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Severity Filter */}
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All severities</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(actionTypeFilter !== 'all' || severityFilter !== 'all' || searchTerm) && (
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant="secondary">{filteredLogs.length} results</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActionTypeFilter('all')
                        setSeverityFilter('all')
                        setSearchTerm('')
                      }}
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Logs Grouped by Day */}
            {Object.entries(groupedLogs).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">No activity logs found</p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedLogs).map(([date, dayLogs]) => (
                <Card key={date}>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      {date}
                    </CardTitle>
                    <CardDescription>{dayLogs.length} activities</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {dayLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-4 rounded-lg border transition-all ${
                            log.severity === 'error'
                              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
                              : log.severity === 'warning'
                              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10'
                              : log.severity === 'success'
                              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {getSeverityIcon(log.severity)}
                                <Badge className={getSeverityBadge(log.severity)}>
                                  {log.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                  {getActionTypeIcon(log.actionType)}
                                  {log.actionType.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(log.timestamp)}
                                </span>
                                {log.isSystemAction && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Activity className="w-3 h-3 mr-1" />
                                    System
                                  </Badge>
                                )}
                              </div>

                              <p className="text-slate-900 dark:text-white font-medium mb-2">
                                {log.description}
                              </p>

                              {log.userName && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  By: {log.userName}
                                </p>
                              )}

                              {/* Expandable Details */}
                              {(log.previousValue || log.newValue || log.metadata) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(log.id)}
                                  className="mt-2 text-xs"
                                >
                                  {expandedLog === log.id ? (
                                    <>
                                      <ChevronUp className="w-3 h-3 mr-1" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                      Show Details
                                    </>
                                  )}
                                </Button>
                              )}

                              {expandedLog === log.id && (
                                <div className="mt-4 space-y-3 text-sm">
                                  {log.previousValue && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Previous Value:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.previousValue), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.newValue && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        New Value:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.metadata && (
                                    <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-md">
                                      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Metadata:
                                      </p>
                                      <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400">
                                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {log.referenceType && log.referenceId && (
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-semibold">Reference:</span>
                                      <Badge variant="outline">
                                        {log.referenceType} #{log.referenceId}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="mt-6 space-y-6">
            {stats && (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Total Activities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {stats.totalLogs}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        All time activity logs
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        User Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.systemVsUser.userActions}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Manual operations
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        System Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {stats.systemVsUser.systemActions}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Automated operations
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* By Action Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Activities by Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.byActionType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {getActionTypeIcon(type)}
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {type.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                                  style={{
                                    width: `${(count / stats.totalLogs) * 100}%`,
                                  }}
                                />
                              </div>
                              <Badge variant="secondary" className="min-w-[60px] justify-center">
                                {count}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Severity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Activities by Severity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(stats.bySeverity).map(([severity, count]) => (
                        <Card key={severity} className="border-2">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                              {getSeverityIcon(severity)}
                              <span className="text-sm font-semibold capitalize">
                                {severity}
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              {count}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Users */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Most Active Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.byUser.slice(0, 10).map((user, index) => (
                        <div key={user.userId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {user.userName}
                            </span>
                          </div>
                          <Badge variant="outline">{user.count} activities</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Activity Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Recent Activity Trend (Last 30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.byDay.slice(0, 15).map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {day.date}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                style={{
                                  width: `${Math.min((day.count / 20) * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <Badge variant="secondary" className="min-w-[50px] justify-center">
                              {day.count}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}