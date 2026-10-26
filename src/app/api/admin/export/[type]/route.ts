export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireAdmin } from "@/lib/api-utils";

/** Quotes a cell for CSV output, escaping inner double quotes. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/** GET /api/admin/export/[type] — CSV download for "participants" or "assignments". */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return jsonError("Kailangan mag-login muna bilang admin.", 401);
    }

    const { type } = await params;
    if (type !== "participants" && type !== "assignments") {
      return jsonError("Unknown export type.", 404);
    }

    let csv = "\uFEFF"; // BOM so Excel renders UTF-8 correctly
    let participantExportHasBunutan = false;

    if (type === "participants") {
      const rows = await db.participant.findMany({
        include: { wishlist: true },
        orderBy: { createdAt: "asc" },
      });
      // When the bunutan already happened, enrich every participant row with
      // their assignment (who they give to + that person's wishes, and who
      // gives to them) so ONE file contains everything the admin needs.
      type BunutanWishlist = {
        wish1Name: string | null;
        wish1Details: string | null;
        wish2Name: string | null;
        wish2Details: string | null;
        wish3Name: string | null;
        wish3Details: string | null;
      } | null;
      type BunutanRow = {
        giver: { id: string; firstName: string; lastName: string; identityCode: string };
        recipient: {
          id: string;
          firstName: string;
          lastName: string;
          identityCode: string;
          wishlist: BunutanWishlist;
        };
      };
      const assignments: BunutanRow[] = await db.assignment.findMany({
        include: {
          giver: { select: { id: true, firstName: true, lastName: true, identityCode: true } },
          recipient: {
            select: { id: true, firstName: true, lastName: true, identityCode: true, wishlist: true },
          },
        },
      });
      const givesTo = new Map<string, BunutanRow>(); // giverId -> assignment
      const receivesFrom = new Map<string, BunutanRow>(); // recipientId -> assignment
      for (const a of assignments) {
        givesTo.set(a.giver.id, a);
        receivesFrom.set(a.recipient.id, a);
      }
      const hasBunutan = assignments.length > 0;
      participantExportHasBunutan = hasBunutan;

      const wishesOf = (wl: BunutanWishlist): string =>
        wl
          ? [
              { name: wl.wish1Name, details: wl.wish1Details },
              { name: wl.wish2Name, details: wl.wish2Details },
              { name: wl.wish3Name, details: wl.wish3Details },
            ]
              .filter((w): w is { name: string; details: string | null } => Boolean(w.name))
              .map((w) => (w.details ? `${w.name} (${w.details})` : w.name))
              .join(" | ")
          : "";

      const header = hasBunutan
        ? [
            "First Name",
            "Last Name",
            "Sex",
            "Identity Code",
            "6-Digit PIN",
            "Wishlist Status",
            "Submitted At",
            "Sample",
            "Gives Gift To (Name)",
            "Gives Gift To (Code)",
            "Recipient Wishes",
            "Receives Gift From (Name)",
            "Receives Gift From (Code)",
          ]
        : [
            "First Name",
            "Last Name",
            "Sex",
            "Identity Code",
            "6-Digit PIN",
            "Wishlist Status",
            "Submitted At",
            "Sample",
          ];

      const lines = [
        header,
        ...rows.map((p) => {
          const base = [
            p.firstName,
            p.lastName,
            p.sex,
            p.identityCode,
            p.pin ?? "", // admin-only: para maisalansya at maibigay ang PIN kapag nakalimutan
            p.wishlist ? "Submitted" : "Pending",
            p.wishlist ? p.wishlist.submittedAt.toISOString() : "",
            p.isSample ? "Yes" : "No",
          ];
          if (!hasBunutan) return base;
          const out = givesTo.get(p.id);
          const inc = receivesFrom.get(p.id);
          return [
            ...base,
            out ? `${out.recipient.firstName} ${out.recipient.lastName}` : "",
            out ? out.recipient.identityCode : "",
            out ? wishesOf(out.recipient.wishlist) : "",
            inc ? `${inc.giver.firstName} ${inc.giver.lastName}` : "",
            inc ? inc.giver.identityCode : "",
          ];
        }),
      ];
      csv += lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n");
    } else {
      const rows = await db.assignment.findMany({
        include: { giver: true, recipient: { include: { wishlist: true } } },
        orderBy: { createdAt: "asc" },
      });
      const lines = [
        ["Giver Name", "Giver Code", "Recipient Name", "Recipient Code", "Recipient Wishes"],
        ...rows.map((a) => {
          const wl = a.recipient.wishlist;
          const wishes = wl
            ? [
                { name: wl.wish1Name, details: wl.wish1Details },
                { name: wl.wish2Name, details: wl.wish2Details },
                { name: wl.wish3Name, details: wl.wish3Details },
              ]
                .filter((w): w is { name: string; details: string | null } => Boolean(w.name))
                .map((w) => (w.details ? `${w.name} (${w.details})` : w.name))
                .join(" | ")
            : "";
          return [
            `${a.giver.firstName} ${a.giver.lastName}`,
            a.giver.identityCode,
            `${a.recipient.firstName} ${a.recipient.lastName}`,
            a.recipient.identityCode,
            wishes,
          ];
        }),
      ];
      csv += lines.map((cells) => cells.map(csvCell).join(",")).join("\r\n");
    }

    const filename =
      type === "participants" && participantExportHasBunutan
        ? "participants-with-bunutan.csv"
        : `${type}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return jsonError("May problema sa server. Pakisubok muli.", 500);
  }
}
