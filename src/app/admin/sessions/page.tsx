"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActiveSession {
  id: string;
  code: string;
  mode: number;
  status: string;
  createdAt: string;
  gameTitle: string | null;
  gameSystem: string | null;
  hostUsername: string | null;
  deviceCount: number;
  durationSeconds: number;
}

interface SessionsResponse {
  sessions: ActiveSession[];
}

async function fetchSessions(): Promise<SessionsResponse> {
  const res = await fetch("/api/admin/sessions");
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

async function terminateSession(code: string) {
  const res = await fetch(`/api/admin/sessions/${code}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to terminate session");
  return res.json();
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AdminSessionsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: fetchSessions,
    refetchInterval: 10_000, // auto-refresh every 10 seconds
  });

  const terminateMutation = useMutation({
    mutationFn: terminateSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-sessions"] }),
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Session Monitor</h1>
          <p className="text-muted-foreground">
            Live view of active gaming sessions. Auto-refreshes every 10 seconds.
          </p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="text-xs">
            {data?.sessions.length ?? 0} active
          </Badge>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">Updated {lastUpdated}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No active sessions.
                  </TableCell>
                </TableRow>
              ) : (
                data?.sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <code className="font-mono font-bold text-sm bg-muted px-1.5 py-0.5 rounded">
                        {s.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{s.gameTitle ?? "Unknown"}</p>
                        {s.gameSystem && (
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {s.gameSystem.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.hostUsername ?? "Guest"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Mode {s.mode}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{s.deviceCount}</span>
                      <span className="text-muted-foreground text-xs"> / 5</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDuration(s.durationSeconds)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => terminateMutation.mutate(s.code)}
                        disabled={terminateMutation.isPending}
                      >
                        Terminate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
