// ============================================================
// SPACER'S — tickie-webhook  (Supabase Edge Function, Deno)
// Sync automatique des abonnés à l'achat sur Tickie (Vivenu).
//
// Déclencheur : webhook Vivenu (ticket.created / order.completed…)
// Pour chaque achat sur l'événement ABONNEMENT, la fonction :
//   1) récupère les billets via l'API Tickie (source de vérité)
//   2) crée / met à jour les lignes `abonnes` (upsert par barcode)
//   3) crée le compte de connexion (auth) manquant + email d'invitation
//
// SÉCURITÉ : la fonction est publique (Vivenu n'envoie pas de JWT),
// donc elle est protégée par un SECRET dans l'URL (?token=...).
// Déployer avec --no-verify-jwt.
//
// PRÉREQUIS pour que l'invitation parte vraiment :
//   - SMTP Mailjet configuré dans Supabase → Authentication → SMTP
//   - un écran "définir mot de passe" côté app (lien d'invitation)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TICKIE_KEY    = Deno.env.get("TICKIE_API_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("TICKIE_WEBHOOK_SECRET")!;
const APP_URL       = Deno.env.get("APP_URL") || "https://spacers-app-abonne.spacersytb.workers.dev";

const TICKIE_BASE = "https://vivenu.com/api";
const EVENT_ABO   = "69fc9d2b69a5578199f9d5e9"; // événement abonnement 2026-27
const SAISON      = "2026-27";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST")    return json({ error: "method_not_allowed" }, 405);

  // 1) Vérif du secret (dans l'URL ?token=... ou en-tête x-webhook-secret)
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-webhook-secret") || "";
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) return json({ error: "forbidden" }, 403);

  // Lecture du payload + log brut (à inspecter dans les logs au 1er achat réel)
  let payload: any = null;
  try { payload = await req.json(); } catch (_) { /* corps vide/non-JSON */ }
  console.log("TICKIE_WEBHOOK payload:", JSON.stringify(payload));

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const headers = { "Authorization": `Bearer ${TICKIE_KEY}`, "Content-Type": "application/json" };

  try {
    // 2) Extraire des identifiants du payload, sans présumer de sa forme exacte
    const barcodes = new Set<string>();
    const txIds = new Set<string>();
    const walk = (o: any, d = 0) => {
      if (!o || d > 6) return;
      if (Array.isArray(o)) { o.forEach((x) => walk(x, d + 1)); return; }
      if (typeof o === "object") {
        if (typeof o.barcode === "string") barcodes.add(o.barcode);
        if (typeof o.transactionId === "string") txIds.add(o.transactionId);
        if (typeof o.transaction === "string") txIds.add(o.transaction);
        if (typeof o.underlyingTransaction === "string") txIds.add(o.underlyingTransaction);
        for (const k in o) walk(o[k], d + 1);
      }
    };
    walk(payload);

    // 3) Source de vérité : les billets de l'événement abonnement via l'API Tickie
    const tRes = await fetch(`${TICKIE_BASE}/tickets?event=${EVENT_ABO}&top=500`, { headers });
    const all: any[] = tRes.ok ? ((await tRes.json()).rows ?? []) : [];
    if (!tRes.ok) console.log("Tickie /tickets non OK:", tRes.status);

    // 4) Cibler les billets : webhook → le(s) billet(s) de l'achat ;
    //    appel sans identifiant (cron/sync) → tout l'événement abonnement (réconciliation).
    const targeted = barcodes.size > 0 || txIds.size > 0;
    const tickets = targeted
      ? all.filter((t) => barcodes.has(t.barcode) || txIds.has(t.transactionId) || txIds.has(t._id))
      : all;

    if (tickets.length === 0) {
      return json({ ok: true, processed: 0, invited: 0, note: "aucun billet ciblé (abonnement)" });
    }

    // 5) Upsert des abonnés (clé d'unicité = tickie_ticket_id, qui contient le barcode)
    const rows = tickets.map((t) => {
      const si = t.seatingInfo || {};
      const siege = [si.rowName, si.seatName].filter(Boolean).join("");
      return {
        prenom: t.firstname || "",
        nom: t.lastname || "",
        email: (t.email || "").trim().toLowerCase(),
        formule: t.ticketName || t.categoryName || "Abonnement",
        saison: SAISON,
        tickie_ticket_id: t.barcode,
        tickie_barcode: t.barcode,
        tickie_order_id: t.transactionId || t._id || null,
        statut: (String(t.status).toUpperCase() === "VALID") ? "actif" : "en_attente",
        tribune: si.sectionName || t.categoryName || null,
        siege: siege || null,
      };
    }).filter((r) => r.tickie_ticket_id && r.email);

    if (rows.length) {
      const { error: upErr } = await admin.from("abonnes").upsert(rows, { onConflict: "tickie_ticket_id" });
      if (upErr) console.log("upsert abonnes error:", upErr.message);
    }

    // 6) Compte de connexion : n'inviter que les emails SANS compte auth existant
    //    (sûr pour le webhook comme pour le cron : aucune ré-invitation).
    const existing = new Set<string>();
    try {
      for (let page = 1; page <= 5; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error || !data?.users?.length) break;
        data.users.forEach((u: any) => { if (u.email) existing.add(u.email.toLowerCase()); });
        if (data.users.length < 1000) break;
      }
    } catch (e) { console.log("listUsers error:", String(e)); }

    const emails = [...new Set(rows.map((r) => r.email))].filter((e) => e && !existing.has(e));
    let invited = 0;
    for (const email of emails) {
      try {
        const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${APP_URL}/` });
        if (invErr) { if (!/already|registered|exist/i.test(invErr.message)) console.log("invite error", email, invErr.message); }
        else invited++;
      } catch (e) { console.log("invite exception", email, String(e)); }
    }

    return json({ ok: true, processed: rows.length, invited });
  } catch (err) {
    console.log("webhook error:", String(err));
    return json({ error: String(err) }, 500);
  }
});
