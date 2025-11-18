"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store";
import {
  DollarSign,
  TrendingUp,
  ClipboardList,
  Calendar,
  Loader2,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { toast } from "sonner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function FacultyDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentSalary: 0,
    totalLectures: 0,
    hoursPerWeek: 0,
    attendanceDays: 0,
  });
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  
  const hasCheckedAuth = useRef(false);
  const hasFetchedData = useRef(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication only once after mount
  useEffect(() => {
    if (!mounted || hasCheckedAuth.current) return;
    
    hasCheckedAuth.current = true;

    if (!token || !user) {
      toast.error("Please login to continue");
      router.push("/login");
      return;
    }

    if (user.role === "admin") {
      toast.info("Redirecting to admin dashboard");
      router.push("/admin/dashboard");
      return;
    }
  }, [mounted, router]);

  // Fetch data only once after auth is confirmed
  useEffect(() => {
    if (!mounted || !hasCheckedAuth.current || hasFetchedData.current) return;
    
    const currentUser = useAuthStore.getState().user;
    const currentToken = useAuthStore.getState().token;
    
    if (!currentUser || !currentToken) {
      setLoading(false);
      return;
    }

    hasFetchedData.current = true;

    const fetchDashboardData = async () => {
      if (!currentUser?.id || !currentToken) {
        console.error("Missing user ID or token");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [salaryRes, workloadRes] = await Promise.all([
          fetch(`/api/salary?facultyId=${currentUser.id}&limit=3`, {
            headers: { Authorization: `Bearer ${currentToken}` },
          }),
          fetch(`/api/workload?facultyId=${currentUser.id}&month=2025-01`, {
            headers: { Authorization: `Bearer ${currentToken}` },
          }),
        ]);

        if (!salaryRes.ok || !workloadRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const salaries = await salaryRes.json();
        const workloads = await workloadRes.json();

        if (Array.isArray(salaries) && salaries.length > 0) {
          setStats((prev) => ({
            ...prev,
            currentSalary: salaries[0].finalSalary,
          }));
          setSalaryHistory(salaries.reverse());
        }

        if (Array.isArray(workloads) && workloads.length > 0) {
          const latest = workloads[0];
          setStats((prev) => ({
            ...prev,
            totalLectures: latest.lecturesTaken,
            hoursPerWeek: latest.hoursPerWeek,
            attendanceDays: latest.attendanceDays,
          }));
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [mounted]);

  const salaryChartData = {
    labels: salaryHistory.map((s) => s.month),
    datasets: [
      {
        label: "Net Salary",
        data: salaryHistory.map((s) => s.finalSalary),
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  if (!mounted || !hasCheckedAuth.current || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950/20">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950/20 min-h-screen">
      {/* Header Section */}
      <div className="animate-fade-in">
        <h1 className="text-4xl font-bold gradient-text mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg">
          {user?.department} • {user?.designation}
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Current Salary Card */}
        <Card className="glass-card hover-lift animate-fade-in border-indigo-100 dark:border-indigo-900/50 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Current Salary
            </CardTitle>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
              ₹{(stats.currentSalary / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">January 2025</p>
          </CardContent>
        </Card>

        {/* Total Lectures Card */}
        <Card className="glass-card hover-lift animate-fade-in border-blue-100 dark:border-blue-900/50 overflow-hidden group" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Total Lectures
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg group-hover:scale-110 transition-transform">
              <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalLectures}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This month</p>
          </CardContent>
        </Card>

        {/* Hours per Week Card */}
        <Card className="glass-card hover-lift animate-fade-in border-slate-100 dark:border-slate-800 overflow-hidden group" style={{ animationDelay: '0.2s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 to-indigo-500/10 dark:from-slate-500/20 dark:to-indigo-500/20"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Hours per Week
            </CardTitle>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.hoursPerWeek}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Teaching hours</p>
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card className="glass-card hover-lift animate-fade-in border-indigo-100 dark:border-indigo-900/50 overflow-hidden group" style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-slate-500/10 dark:from-indigo-500/20 dark:to-slate-500/20"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Attendance
            </CardTitle>
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
              {stats.attendanceDays}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Days present</p>
          </CardContent>
        </Card>
      </div>

      {/* Salary History Chart */}
      <Card className="glass-card hover-lift animate-fade-in border-indigo-100 dark:border-indigo-900/50" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Salary History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salaryHistory.length > 0 ? (
            <div className="h-[300px]">
              <Line
                data={salaryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(99, 102, 241, 0.9)',
                      padding: 12,
                      cornerRadius: 8,
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                      },
                      ticks: {
                        callback: (value) => `₹${(Number(value) / 1000).toFixed(0)}K`,
                        color: 'rgb(100, 116, 139)',
                      },
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                      ticks: {
                        color: 'rgb(100, 116, 139)',
                      },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
              No salary history available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Salary Records */}
      <Card className="glass-card hover-lift animate-fade-in border-indigo-100 dark:border-indigo-900/50" style={{ animationDelay: '0.5s' }}>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Recent Salary Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salaryHistory.length > 0 ? (
            <div className="space-y-4">
              {salaryHistory.map((salary, index) => (
                <div
                  key={salary.id}
                  className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/30 rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                >
                  <div>
                    <p className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                      {salary.month}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Base: ₹{salary.baseSalary.toLocaleString()} + Allowances: ₹
                      {salary.allowances.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-2xl text-indigo-600 dark:text-indigo-400">
                      ₹{salary.finalSalary.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Net Salary
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No salary records found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}