"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SYSTEMS = ["nes", "snes", "gba", "n64", "psp", "ps2"] as const;
const GENRES = [
  "Action",
  "RPG",
  "Platformer",
  "Sports",
  "Racing",
  "Puzzle",
  "Fighting",
  "Adventure",
  "Simulation",
  "Strategy",
];

interface FormState {
  title: string;
  system: string;
  genre: string;
  description: string;
  releaseYear: string;
  playerCount: string;
  isPremium: boolean;
  price: string;
}

export default function AdminGameUploadPage() {
  const router = useRouter();
  const romRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    title: "",
    system: "",
    genre: "",
    description: "",
    releaseYear: "",
    playerCount: "1",
    isPremium: false,
    price: "",
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function uploadFile(
    file: File,
    signedUrl: string
  ): Promise<void> {
    const res = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type || "application/octet-stream" },
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const romFile = romRef.current?.files?.[0];
    const artFile = artRef.current?.files?.[0];

    if (!romFile) {
      setError("ROM file is required");
      return;
    }
    if (!form.title || !form.system || !form.genre) {
      setError("Title, system, and genre are required");
      return;
    }

    setUploading(true);
    try {
      // 1. Get signed PUT URLs from the API
      const slug = form.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const romPath = `roms/${slug}-${Date.now()}.${romFile.name.split(".").pop()}`;
      const artPath = artFile
        ? `art/${slug}-${Date.now()}.${artFile.name.split(".").pop()}`
        : null;

      const urlRes = await fetch("/api/admin/games/upload-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          romPath,
          romContentType: romFile.type || "application/octet-stream",
          artPath,
          artContentType: artFile?.type,
        }),
      });

      if (!urlRes.ok) {
        const data = await urlRes.json();
        throw new Error(data.error?.message ?? "Failed to get upload URLs");
      }

      const { romUploadUrl, artUploadUrl } = await urlRes.json();

      // 2. Upload files directly to R2
      await uploadFile(romFile, romUploadUrl);
      if (artFile && artUploadUrl) {
        await uploadFile(artFile, artUploadUrl);
      }

      // 3. Create game record
      const gameRes = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug,
          system: form.system,
          genre: form.genre,
          description: form.description || null,
          releaseYear: form.releaseYear ? parseInt(form.releaseYear, 10) : null,
          playerCount: parseInt(form.playerCount, 10) || 1,
          isPremium: form.isPremium,
          price: form.isPremium && form.price ? Math.round(parseFloat(form.price) * 100) : null,
          romPath,
          coverArtPath: artPath,
        }),
      });

      if (!gameRes.ok) {
        const data = await gameRes.json();
        throw new Error(data.error?.message ?? "Failed to create game record");
      }

      router.push("/admin/games");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Upload New Game</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="system">System *</Label>
            <Select onValueChange={(v) => update("system", v)} required>
              <SelectTrigger id="system">
                <SelectValue placeholder="Select system" />
              </SelectTrigger>
              <SelectContent>
                {SYSTEMS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genre">Genre *</Label>
            <Select onValueChange={(v) => update("genre", v)} required>
              <SelectTrigger id="genre">
                <SelectValue placeholder="Select genre" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Game description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="releaseYear">Release Year</Label>
            <Input
              id="releaseYear"
              type="number"
              min={1970}
              max={2030}
              value={form.releaseYear}
              onChange={(e) => update("releaseYear", e.target.value)}
              placeholder="e.g. 1996"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="playerCount">Player Count</Label>
            <Input
              id="playerCount"
              type="number"
              min={1}
              max={4}
              value={form.playerCount}
              onChange={(e) => update("playerCount", e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isPremium"
            type="checkbox"
            checked={form.isPremium}
            onChange={(e) => update("isPremium", e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="isPremium">Premium game (requires purchase or Pro tier)</Label>
        </div>

        {form.isPremium && (
          <div className="space-y-1.5">
            <Label htmlFor="price">Price (USD, $2.99–$9.99)</Label>
            <Input
              id="price"
              type="number"
              min={2.99}
              max={9.99}
              step={0.01}
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="e.g. 4.99"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="romFile">ROM File *</Label>
          <Input
            id="romFile"
            type="file"
            ref={romRef}
            accept=".nes,.sfc,.smc,.gba,.n64,.z64,.iso,.cso,.pbp"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="artFile">Cover Art (optional)</Label>
          <Input
            id="artFile"
            type="file"
            ref={artRef}
            accept="image/jpeg,image/png,image/webp"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Game"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/games")}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
