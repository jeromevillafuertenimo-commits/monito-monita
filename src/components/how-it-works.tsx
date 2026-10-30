"use client";

// "Paano ito gumagana" guide with a Tagalog / English toggle.
// Opens automatically on a person's first visit (remembered on this device).
import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { lsGet, lsSet } from "@/lib/local-store";

type Lang = "tl" | "en";

function steps(lang: Lang, min: number, max: number): { title: string; body: string }[] {
  if (lang === "en") {
    return [
      { title: "1. Register", body: "Enter your first and last name, pick a secret identity code (a color + a flower or animal), and create a 6-digit PIN. Nobody else sees your real name." },
      { title: "2. Write your wishlist", body: `Add up to 3 gift wishes. The budget is ₱${min}–₱${max}. Add details like size, color, or brand.` },
      { title: "3. The draw", body: "After the organizer locks submissions, everyone is paired fairly at random. Nobody can draw themselves." },
      { title: "4. Reveal", body: "Once results are released, sign in with your first name, last name, and PIN to open your gift box and see who you will give a gift to." },
      { title: "5. Bring the gift", body: "Wrap your gift and bring it to the Christmas Fellowship. Keep it a secret until then! 🎁" },
    ];
  }
  return [
    { title: "1. Mag-register", body: "Ilagay ang First name at Last name mo, pumili ng secret identity code (color + flower o animal), at gumawa ng 6-digit PIN. Walang ibang makakakita ng totoong pangalan mo." },
    { title: "2. Isulat ang wishlist", body: `Maglagay ng hanggang 3 gift wishes. Ang budget ay ₱${min}–₱${max}. Isama ang details gaya ng size, kulay, o brand.` },
    { title: "3. Ang bunutan", body: "Kapag na-lock na ng organizer ang submissions, random at patas ang pagtatambal. Hindi puwedeng mabunot ang sarili." },
    { title: "4. Reveal", body: "Kapag na-release na ang results, mag-sign in gamit ang First name, Last name, at PIN mo para buksan ang gift box at makita kung sino ang reregaluhan mo." },
    { title: "5. Dalhin ang regalo", body: "I-wrap ang regalo at dalhin sa Christmas Fellowship. Itago muna ang sikreto hanggang doon! 🎁" },
  ];
}

export function HowItWorks({ budgetMin = 150, budgetMax = 200 }: { budgetMin?: number; budgetMax?: number }) {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("tl");

  useEffect(() => {
    if (lsGet("mm-seen-howto") !== "1") {
      setOpen(true);
      lsSet("mm-seen-howto", "1");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 gap-2 rounded-lg text-xmas-forest hover:bg-accent"
        >
          <HelpCircle aria-hidden /> Paano ito gumagana?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-xmas-forest">
            {lang === "tl" ? "Paano ito gumagana?" : "How it works"}
          </DialogTitle>
          <DialogDescription>
            {lang === "tl" ? "Limang simpleng hakbang lang." : "Just five simple steps."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2" role="group" aria-label="Language">
          {(["tl", "en"] as const).map((l) => (
            <Button
              key={l}
              type="button"
              size="sm"
              variant={lang === l ? "default" : "outline"}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className="min-h-9 rounded-full"
            >
              {l === "tl" ? "Tagalog" : "English"}
            </Button>
          ))}
        </div>
        <ol className="space-y-3">
          {steps(lang, budgetMin, budgetMax).map((s) => (
            <li key={s.title} className="rounded-lg border border-border/70 bg-muted/40 p-3">
              <p className="font-heading text-sm font-bold text-xmas-forest">{s.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
        <Button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg bg-xmas-forest text-xmas-cream hover:bg-xmas-pine">
          {lang === "tl" ? "Sige, okay na!" : "Got it!"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
