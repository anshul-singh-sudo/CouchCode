"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: form.get("email") as string,
      password: form.get("password") as string,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setLoginError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegisterError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        username: form.get("username"),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setRegisterError(data.error?.message ?? "Registration failed");
      setLoading(false);
      return;
    }
    // Auto-login after registration
    await signIn("credentials", {
      email: form.get("email") as string,
      password: form.get("password") as string,
      redirect: false,
    });
    setLoading(false);
    router.push("/dashboard");
  }

  async function handleGuestPlay() {
    setLoading(true);
    await fetch("/api/auth/guest", { method: "POST" });
    setLoading(false);
    router.push("/games");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">CouchCode</h1>
          <p className="text-muted-foreground mt-1">Play retro games in your browser</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {loginError && (
                    <p className="text-sm text-destructive">{loginError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in…" : "Sign In"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  disabled={loading}
                >
                  Continue with Google
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input
                      id="reg-username"
                      name="username"
                      type="text"
                      placeholder="gamer123"
                      required
                      minLength={3}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      name="password"
                      type="password"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      required
                      minLength={8}
                    />
                  </div>
                  {registerError && (
                    <p className="text-sm text-destructive">{registerError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account…" : "Create Account"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  disabled={loading}
                >
                  Sign up with Google
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Just want to try it out?</p>
          <Button variant="secondary" className="w-full" onClick={handleGuestPlay} disabled={loading}>
            Play as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}
