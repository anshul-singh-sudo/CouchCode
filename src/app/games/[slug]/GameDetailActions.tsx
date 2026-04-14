"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

interface Props {
  gameId: string;
  isFavorited: boolean;
}

export default function GameDetailActions({ gameId, isFavorited: initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  async function toggleFavorite() {
    startTransition(async () => {
      const method = favorited ? "DELETE" : "POST";
      const res = await fetch(`/api/user/favorites/${gameId}`, { method });
      if (res.ok) {
        setFavorited((f) => !f);
      }
    });
  }

  return (
    <Button
      variant={favorited ? "default" : "outline"}
      size="lg"
      onClick={toggleFavorite}
      disabled={isPending}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`mr-2 h-4 w-4 ${favorited ? "fill-current" : ""}`}
      />
      {favorited ? "Favorited" : "Favorite"}
    </Button>
  );
}
