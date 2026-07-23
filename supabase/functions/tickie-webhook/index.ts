// ============================================================
// SPACER'S — tickie-webhook  (Supabase Edge Function, Deno)
// Sync automatique des abonnés à l'achat sur Tickie (Vivenu).
//
// Déclencheur : webhook Vivenu (ticket.created / order.completed…)
// Pour chaque achat sur l'événement ABONNEMENT, la fonction :
//   1) récupère les billets via l'API Tickie (source de vérité)
//   2) crée les lignes `abonnes` manquantes / met à jour les champs billetterie
//   3) crée le compte de connexion (auth) manquant + email d'invitation
//
// SÉCURITÉ : la fonction est publique (Vivenu n'envoie pas de JWT),
// donc elle est protégée par un SECRET dans l'URL (?token=...).
// Déployer avec --no-verify-jwt.
//
// PRÉREQUIS pour que l'invitation parte vraiment :
//   - SMTP configuré dans Supabase → Authentication → SMTP
//   - un écran "définir mot de passe" côté app (lien d'invitation)
//
// ── RÈGLES IMPORTANTES (v2) ────────────────────────────────
// A) RGPD : une fiche dont statut = 'supprime' n'est JAMAIS retouchée.
//    L'effacement (Art. 17) anonymise la fiche mais conserve son
//    tickie_ticket_id ; sans ce garde-fou, la synchro suivante y
//    réécrirait nom/email depuis Tickie et annulerait l'effacement.
// B) Les données saisies par l'abonné dans l'app (prénom, nom, email
//    de connexion) ne sont plus écrasées sur les fiches existantes :
//    seuls les champs billetterie sont rafraîchis. Écraser l'email
//    romprait le lien avec son compte de connexion (RLS par email).
// C) Pagination : plus de plafond fixe (top=500) qui aurait
//    silencieusement ignoré les abonnés au-delà du 500e.
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
// Interrupteur d'invitations : tant que != "true", la sync NE crée PAS de comptes
// ni n'envoie d'emails (sync des données seule). À passer à "true" le jour du lancement.
const INVITES_ENABLED = (Deno.env.get("INVITES_ENABLED") || "").toLowerCase() === "true";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

// ── Récupération ciblée : Vivenu sait filtrer par code-barres ──
async function fetchByBarcodes(barcodes: string[], headers: Record<string, string>) {
  const out: any[] = [];
  for (const bc of barcodes) {
    try {
      const r = await fetch(`${TICKIE_BASE}/tickets?event=${EVENT_ABO}&barcode=${encodeURIComponent(bc)}`, { headers });
      if (r.ok) {
        const rows: any[] = (await r.json()).rows ?? [];
        out.push(...rows.filter((t) => t.barcode === bc)); // garde-fou si le filtre était ignoré
      }
    } catch (e) { console.log("fetchByBarcodes", bc, String(e)); }
  }
  return out;
}

// ── Récupération complète paginée (réconciliation) ──
async function fetchAllTickets(headers: Record<string, string>) {
  const out: any[] = [];
  const seen = new Set<string>();
  const PAGE = 200;
  for (let i = 0; i < 50; i++) {           // plafond de sécurité : 10 000 billets
    let rows: any[] = [];
    try {
      const r = await fetch(`${TICKIE_BASE}/tickets?event=${EVENT_ABO}&top=${PAGE}&skip=${i * PAGE}`, { headers });
      if (!r.ok) { console.log("Tickie /tickets non OK:", r.status); break; }
      rows = (await r.json()).rows ?? [];
    } catch (e) { console.log("fetchAllTickets", String(e)); break; }

    if (!rows.length) break;
    let added = 0;
    for (const t of rows) {
      const k = t.barcode || t._id;
      if (k && !seen.has(k)) { seen.add(k); out.push(t); added++; }
    }
    // Si `skip` n'était pas supporté, on recevrait la même page : on s'arrête.
    if (added === 0) break;
    if (rows.length < PAGE) break;         // dernière page
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST")    return json({ error: "method_not_allowed" }, 405);

  // 1) Vérif du secret (dans l'URL ?token=... ou en-tête x-webhook-secret)
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-webhook-secret") || "";
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) return json({ error: "forbidden" }, 403);

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

    // 3) Cibler les billets.
    //    - transaction connue -> il peut y avoir plusieurs billets dans la commande,
    //      donc on parcourt l'événement et on filtre.
    //    - seulement des codes-barres -> requêtes ciblées (rapide).
    //    - rien -> réconciliation complète.
    let tickets: any[];
    let mode: string;
    if (txIds.size > 0) {
      const all = await fetchAllTickets(headers);
      tickets = all.filter((t) => txIds.has(t.transactionId) || txIds.has(t._id) || barcodes.has(t.barcode));
      mode = "transaction";
    } else if (barcodes.size > 0) {
      tickets = await fetchByBarcodes([...barcodes], headers);
      mode = "barcode";
    } else {
      tickets = await fetchAllTickets(headers);
      mode = "reconciliation";
    }

    if (tickets.length === 0) {
      return json({ ok: true, mode, processed: 0, invited: 0, note: "aucun billet ciblé (abonnement)" });
    }

    // 4) Mise en forme
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

    // 5) Que sait-on déjà de ces billets ?
    const ids = [...new Set(rows.map((r) => r.tickie_ticket_id))];
    const { data: known } = await admin
      .from("abonnes")
      .select("id, tickie_ticket_id, statut")
      .in("tickie_ticket_id", ids);

    const byTicket = new Map<string, any>((known || []).map((k: any) => [k.tickie_ticket_id, k]));

    const toInsert: any[] = [];
    const toUpdate: any[] = [];
    let skippedDeleted = 0;

    for (const r of rows) {
      const ex = byTicket.get(r.tickie_ticket_id);
      if (!ex) { toInsert.push(r); continue; }
      // (A) RGPD : fiche effacée -> on n'y touche jamais.
      if (String(ex.statut).toLowerCase() === "supprime") { skippedDeleted++; continue; }
      // (B) On ne rafraîchit que les champs billetterie : prenom/nom/email
      //     appartiennent à l'abonné (et l'email porte son accès).
      toUpdate.push({
        id: ex.id,
        patch: {
          formule: r.formule,
          saison: r.saison,
          statut: r.statut,
          tribune: r.tribune,
          siege: r.siege,
          tickie_barcode: r.tickie_barcode,
          tickie_order_id: r.tickie_order_id,
        },
      });
    }

    let inserted = 0;
    if (toInsert.length) {
      const { error } = await admin.from("abonnes").insert(toInsert);
      if (error) console.log("insert abonnes error:", error.message);
      else inserted = toInsert.length;
    }

    let updated = 0;
    for (const u of toUpdate) {
      const { error } = await admin.from("abonnes").update(u.patch).eq("id", u.id);
      if (error) console.log("update abonne error:", u.id, error.message);
      else updated++;
    }

    // 6) Invitations : uniquement pour les NOUVELLES fiches, et seulement
    //    si INVITES_ENABLED = true. Aucune ré-invitation d'un compte existant.
    // Périmètre invitable : toutes les fiches traitées SAUF les comptes
    // effacés (RGPD). On ne se limite pas aux nouvelles fiches : sinon une
    // invitation échouée (quota, boîte pleine) ne serait jamais rattrapée.
    // Les personnes déjà inscrites sont filtrées juste après via `existing`.
    const invitable = rows.filter((r) => {
      const ex = byTicket.get(r.tickie_ticket_id);
      return !ex || String(ex.statut).toLowerCase() !== "supprime";
    });

    let invited = 0;
    if (INVITES_ENABLED && invitable.length) {
      const existing = new Set<string>();
      try {
        for (let page = 1; page <= 5; page++) {
          const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
          if (error || !data?.users?.length) break;
          data.users.forEach((u: any) => { if (u.email) existing.add(u.email.toLowerCase()); });
          if (data.users.length < 1000) break;
        }
      } catch (e) { console.log("listUsers error:", String(e)); }

      const emails = [...new Set(invitable.map((r) => r.email))].filter((e) => e && !existing.has(e));
      for (const email of emails) {
        try {
          const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${APP_URL}/` });
          if (invErr) { if (!/already|registered|exist/i.test(invErr.message)) console.log("invite error", email, invErr.message); }
          else invited++;
        } catch (e) { console.log("invite exception", email, String(e)); }
      }
    } else if (!INVITES_ENABLED) {
      console.log("Invitations desactivees (INVITES_ENABLED != true) - sync des donnees seule.");
    }

    return json({
      ok: true,
      mode,
      tickets: rows.length,
      inserted,
      updated,
      skipped_deleted: skippedDeleted,
      invited,
      invites_enabled: INVITES_ENABLED,
    });
  } catch (err) {
    console.log("webhook error:", String(err));
    return json({ error: String(err) }, 500);
  }
});
