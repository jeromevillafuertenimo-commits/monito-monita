"use client";

// Admin login view — gateway to the admin dashboard.
// Contract: single default export AdminLoginView({ ctx }: { ctx: AppCtx }).

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  User,
} from "lucide-react";
import { AppCtx } from "@/lib/app-context";
import { apiJson } from "@/lib/api-utils-client";
import { toast } from "sonner";
import { ChristmasCard } from "@/components/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AdminLoginView({ ctx }: { ctx: AppCtx }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (!username.trim() || !password) {
      toast.error("Pakiful-fill ng username at password.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiJson<{ username: string }>("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      toast.success(`Welcome, ${data.username}!`);
      ctx.goAdmin();
    } catch (err) {
      // 401 mali ang credentials, 429/500 etc. — server sends a Taglish message.
      toast.error(err instanceof Error ? err.message : "May error sa pag-login. Pakisubok muli.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[62vh] items-center justify-center py-4">
      <ChristmasCard className="w-full max-w-md">
        <div className="p-6 sm:p-8">
          {/* Icon + heading */}
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-xmas-gold/15 ring-4 ring-xmas-gold/25"
              aria-hidden
            >
              <LockKeyhole className="h-8 w-8 text-xmas-gold" />
            </span>
            <h1 className="font-heading text-2xl font-bold text-xmas-forest sm:text-3xl">
              Admin Login
            </h1>
            <p className="text-sm text-muted-foreground">
              Para ito sa organizer lang ng Monito–Monita. 🔐
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="admin-username">Username</Label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="admin-username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-xmas-gold"
                  aria-label={showPassword ? "Itago ang password" : "Ipakita ang password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full bg-xmas-forest text-white hover:bg-xmas-forest/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <Separator className="my-5" />

          <Button
            variant="ghost"
            className="w-full text-xmas-forest hover:bg-accent hover:text-xmas-forest"
            onClick={() => ctx.navigate("welcome")}
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Home
          </Button>
        </div>
      </ChristmasCard>
    </div>
  );
}
