"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminGame {
  id: string;
  title: string;
  slug: string;
  system: string;
  genre: string;
  isActive: boolean;
  isPremium: boolean;
  price: number | null;
  totalPlays: number;
  releaseYear: number | null;
  playerCount: number;
  description: string | null;
  coverArtPath: string | null;
  createdAt: string;
}

interface GamesResponse {
  games: AdminGame[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

async function fetchAdminGames(params: URLSearchParams): Promise<GamesResponse> {
  const res = await fetch(`/api/admin/games?${params}`);
  if (!res.ok) throw new Error("Failed to fetch games");
  return res.json();
}

async function toggleGameStatus(id: string) {
  const res = await fetch(`/api/admin/games/${id}/status`, { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle status");
  return res.json();
}

async function updateGame(id: string, data: Partial<AdminGame>) {
  const res = await fetch(`/api/admin/games/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update game");
  return res.json();
}

export default function AdminGamesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editGame, setEditGame] = useState<AdminGame | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminGame>>({});

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-games", page, search],
    queryFn: () => fetchAdminGames(params),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleGameStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-games"] }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminGame> }) =>
      updateGame(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-games"] });
      setEditGame(null);
    },
  });

  const openEdit = (game: AdminGame) => {
    setEditGame(game);
    setEditForm({
      title: game.title,
      system: game.system,
      genre: game.genre,
      description: game.description ?? "",
      releaseYear: game.releaseYear ?? undefined,
      playerCount: game.playerCount,
      isPremium: game.isPremium,
      price: game.price ?? undefined,
    });
  };

  const handleEditSave = () => {
    if (!editGame) return;
    editMutation.mutate({ id: editGame.id, data: editForm });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Game Management</h1>
        <p className="text-muted-foreground">Edit games, toggle visibility, and view stats.</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search games..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Button variant="outline" asChild>
          <a href="/admin/games/upload">Upload New Game</a>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Plays</TableHead>
                <TableHead>Premium</TableHead>
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
              ) : data?.games.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No games found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.games.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-medium">{game.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{game.system.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{game.genre}</TableCell>
                    <TableCell>
                      <Badge variant={game.isActive ? "default" : "secondary"}>
                        {game.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{game.totalPlays.toLocaleString()}</TableCell>
                    <TableCell>
                      {game.isPremium ? (
                        <Badge variant="default">
                          ${((game.price ?? 0) / 100).toFixed(2)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(game)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={game.isActive ? "destructive" : "outline"}
                          onClick={() => toggleMutation.mutate(game.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {game.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {data.pagination.pages} ({data.pagination.total} games)
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Game Dialog */}
      <Dialog open={!!editGame} onOpenChange={(open) => !open && setEditGame(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={editForm.title ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>System</Label>
                <Select
                  value={editForm.system ?? ""}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, system: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["nes", "snes", "gba", "n64", "psp", "ps2"].map((s) => (
                      <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Genre</Label>
                <Input
                  value={editForm.genre ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, genre: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Release Year</Label>
                <Input
                  type="number"
                  value={editForm.releaseYear ?? ""}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, releaseYear: parseInt(e.target.value) || undefined }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Player Count</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={editForm.playerCount ?? 1}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, playerCount: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Price (cents, 0 = free)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.price ?? 0}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, price: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={editForm.description ?? ""}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Per-game stats */}
            {editGame && (
              <div className="rounded-md border p-3 bg-muted/30 text-sm space-y-1">
                <p className="font-medium">Stats</p>
                <p className="text-muted-foreground">Total plays: <span className="text-foreground font-medium">{editGame.totalPlays.toLocaleString()}</span></p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleEditSave}
                disabled={editMutation.isPending}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditGame(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
