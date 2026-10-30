"use client";

// Menu shown right after a participant signs in while registration is still
// open. Instead of dropping them straight into the wishlist editor, they pick:
// Edit Identity Code / Edit Wishlist / View My Details.
import { useEffect } from "react";
import { ChevronRight, Gift, KeyRound, LogOut, Pencil, Star } from "lucide-react";
import { toast } from "sonner";
import { AppCtx } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { ChristmasCard } from "@/components/decor";

interface MenuItem {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  note?: string;
}

export default function ParticipantMenuView({ ctx }: { ctx: AppCtx }) {
  const { navigate, session, event, setSession } = ctx;

  useEffect(() => {
    if (!session) navigate("welcome");
  }, [session, navigate]);

  if (!session) return null;

  const canEditIdentity =
    !!event?.registrationOpen && !event?.submissionsLocked && event?.randomizationStatus === "not_started";

  const items: MenuItem[] = [
    {
      key: "identity",
      title: "Edit Identity Code",
      description: "Palitan ang color at flower/animal ng secret identity code mo.",
      icon: <Pencil className="h-5 w-5" aria-hidden />,
      onClick: () => navigate("edit-identity"),
      disabled: !canEditIdentity,
      note: canEditIdentity ? undefined : "Sarado na ang registration — hindi na puwedeng palitan ang code.",
    },
    {
      key: "wishlist",
      title: "Edit Wishlist",
      description: "Isulat o i-update ang hanggang 3 gift wishes mo.",
      icon: <Gift className="h-5 w-5" aria-hidden />,
      onClick: () => navigate("wishlist"),
    },
    {
      key: "details",
      title: "View My Details",
      description: "Tingnan ang sign-in details mo at i-copy ang 6-digit PIN.",
      icon: <KeyRound className="h-5 w-5" aria-hidden />,
      onClick: () => navigate("my-details"),
    },
  ];

  const handleLogout = () => {
    setSession(null);
    toast.success("Naka-log out na. 👋 Mag-sign in muli gamit ang pangalan at PIN mo kapag babalik ka.");
    navigate("welcome");
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <Star className="h-6 w-6 fill-xmas-gold text-xmas-gold" aria-hidden />
        <h1 className="font-heading text-2xl font-bold text-xmas-forest sm:text-3xl">
          Welcome back, {session.identityCode}! 🎄
        </h1>
        <p className="text-sm text-muted-foreground">Ano ang gusto mong gawin?</p>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className="text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ChristmasCard className="flex items-center gap-4 p-4 transition-colors hover:border-xmas-gold/70 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-xmas-forest/10 text-xmas-forest">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-base font-bold text-xmas-forest">{item.title}</span>
                <span className="block text-sm text-muted-foreground">{item.description}</span>
                {item.note && <span className="mt-1 block text-xs font-medium text-xmas-burgundy">{item.note}</span>}
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            </ChristmasCard>
          </button>
        ))}
      </div>

      <div className="border-t border-border/70 pt-3 text-center">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="min-h-11 gap-2 text-muted-foreground hover:text-xmas-forest"
        >
          <LogOut aria-hidden /> Mag-log out
        </Button>
      </div>
    </div>
  );
}
