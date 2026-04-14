"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  dau: number;
  mau: number;
  activeSessions: number;
  mrr: number;
  totalRevenue: number;
  newSubs: number;
  churnRate: number;
  topGames: Array<{ id: string; title: string; system: string; totalPlays: number }>;
  deviceBreakdown: Array<{ type: string; count: number }>;
  modeBreakdown: Array<{ mode: string; count: number }>;
  adImpressions: number;
  estimatedAdRevenue: number;
  dauTrend: Array<{ date: string; count: number }>;
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/admin/analytics");
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const mrrFormatted = `$${(data.mrr / 100).toFixed(2)}`;
  const totalRevenueFormatted = `$${(data.totalRevenue / 100).toFixed(2)}`;
  const adRevenueFormatted = `$${(data.estimatedAdRevenue / 100).toFixed(2)}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Platform metrics and performance overview.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Daily Active Users" value={data.dau.toLocaleString()} />
        <StatCard title="Monthly Active Users" value={data.mau.toLocaleString()} />
        <StatCard title="Active Sessions" value={data.activeSessions.toLocaleString()} />
        <StatCard title="MRR" value={mrrFormatted} sub="Monthly Recurring Revenue" />
        <StatCard title="Total Revenue" value={totalRevenueFormatted} />
        <StatCard title="New Subscriptions" value={data.newSubs.toLocaleString()} sub="This month" />
        <StatCard title="Churn Rate" value={`${data.churnRate}%`} sub="This month" />
        <StatCard
          title="Ad Impressions"
          value={data.adImpressions.toLocaleString()}
          sub={`Est. ${adRevenueFormatted}`}
        />
      </div>

      {/* DAU Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Active Users (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dauTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="DAU"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top 10 Games */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Games by Plays</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.topGames}
                layout="vertical"
                margin={{ left: 16, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="totalPlays" fill="#6366f1" name="Total Plays" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Mode Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Gameplay Mode Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data.modeBreakdown.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                No session data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.modeBreakdown}
                    dataKey="count"
                    nameKey="mode"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ mode, percent }) =>
                      `${mode} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {data.modeBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.deviceBreakdown}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ type, percent }) =>
                    `${type} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {data.deviceBreakdown.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
