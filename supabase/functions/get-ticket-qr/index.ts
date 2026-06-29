// ============================================================
// SPACER'S — get-ticket-qr  (Supabase Edge Function, Deno)
// Renvoie le vrai code-barres Tickie du billet de l'abonné.
//
// Sécurité : la clé Tickie et la clé service_role ne quittent
// jamais le serveur. L'abonné est authentifié via son JWT, et
// ne peut récupérer que les billets liés à son adresse email.
//
// DÉPLOIEMENT :
//   1) placer ce fichier en supabase/functions/get-ticket-qr/index.ts
//   2) npx supabase secrets set TICKIE_API_KEY=...   (voir runbook)
//   3) npx supabase functions deploy get-ticket-qr
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// sont injectés automatiquement par la plateforme. Seule TICKIE_API_KEY
// doit être posée manuellement via `supabase secrets set`.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const TICKIE_KEY   = Deno.env.get("TICKIE_API_KEY")!;
const TICKIE_BASE  = "https://vivenu.com/api";
const EVENT_ABO    = "69fc9d2b69a5578199f9d5e9"; // événement abonnement 2026-27

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const norm = (s: unknown) => (s ?? "").toString().trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method_not_allowed" }, 405);

  try {
    // 1) Authentifier l'abonné via son JWT
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    // 2) Quel billet ? (abonne_id du corps, sinon le billet lié au compte)
    let abonneId: string | null = null;
    try { abonneId = (await req.json())?.abonne_id ?? null; } catch (_) { /* body vide */ }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cols = "id, prenom, nom, email, tickie_ticket_id, tickie_barcode";
    const q = admin.from("abonnes").select(cols);
    const { data: abonne } = abonneId
      ? await q.eq("id", abonneId).maybeSingle()
      : await q.eq("user_id", user.id).limit(1).maybeSingle();

    if (!abonne) return json({ error: "abonne_not_found" }, 404);

    // 3) Vérif d'appartenance : le billet doit être lié à l'email connecté
    if (norm(abonne.email) !== norm(user.email)) {
      return json({ error: "forbidden" }, 403);
    }

    // 4) Le barcode est déjà connu en base : tickie_barcode (cache) ou
    //    tickie_ticket_id (l'import y a stocké le BARCODE, pas un _id Tickie).
    const barcode = abonne.tickie_barcode || abonne.tickie_ticket_id || null;
    if (!barcode) return json({ error: "no_ticket" }, 404);

    // 5) Enrichissement best-effort via Tickie (nom / catégorie / place).
    //    On liste les billets de l'événement et on retrouve le bon par barcode.
    //    Si Tickie ne répond pas, on renvoie quand même le QR.
    const headers = { "Authorization": `Bearer ${TICKIE_KEY}`, "Content-Type": "application/json" };
    let ticket: any = null;
    try {
      const r = await fetch(`${TICKIE_BASE}/tickets?event=${EVENT_ABO}&top=200`, { headers });
      if (r.ok) {
        const rows: any[] = (await r.json()).rows ?? [];
        ticket = rows.find((t) => t.barcode === barcode) ?? null;
      }
    } catch (_) { /* enrichissement optionnel */ }

    // 6) Mettre le barcode en cache si ce n'était pas déjà fait
    if (!abonne.tickie_barcode) {
      await admin.from("abonnes").update({ tickie_barcode: barcode }).eq("id", abonne.id);
    }

    const si = ticket?.seatingInfo ?? null;

    return json({
      barcode,
      ticket_name: ticket?.ticketName ?? ticket?.name ?? null,
      category:    ticket?.categoryName ?? null,
      section:     si?.sectionName ?? ticket?.categoryName ?? null,
      row:         si?.rowName ?? null,
      seat:        si?.seatName ?? null,
      gate:        si?.gate ?? null,
      status:      ticket?.status ?? null,
      source:      ticket ? "tickie" : "cache",
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
