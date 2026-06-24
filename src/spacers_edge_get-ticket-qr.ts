// ============================================================
// SPACER'S — GET-TICKET-QR
// Récupère le vrai QR code Tickie de l'abonné connecté
// 
// DÉPLOIEMENT :
//   supabase functions deploy get-ticket-qr
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON    = Deno.env.get("SUPABASE_ANON_KEY")!;
const TICKIE_API_KEY   = Deno.env.get("TICKIE_API_KEY")!;
const TICKIE_BASE      = "https://vivenu.com/api";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── 1. Vérifier l'auth de l'abonné ──────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response("Unauthorized", { status: 401 });

    // Client avec le token de l'abonné pour vérifier son identité
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return new Response("Unauthorized", { status: 401 });

    // ── 2. Récupérer l'abonné depuis Supabase ────────────────
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: abonne } = await supabaseAdmin
      .from("abonnes")
      .select("id, prenom, nom, email, tickie_ticket_id, tickie_order_id")
      .eq("user_id", user.id)
      .single();

    if (!abonne) return new Response("Abonné non trouvé", { status: 404 });

    // ── 3. Si on a déjà le ticket ID en cache → retour direct
    if (abonne.tickie_ticket_id) {
      return new Response(
        JSON.stringify({ 
          barcode: abonne.tickie_ticket_id,
          source: "cache"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Chercher le ticket dans Tickie via l'email ────────
    // GET /tickets?email=xxx&event=EVENT_ABONNEMENT_ID
    const EVENT_ABO_ID = "69fc9d2b69a5578199f9d5e9"; // ID événement abonnement 2026-27

    const tickieRes = await fetch(
      `${TICKIE_BASE}/tickets?email=${encodeURIComponent(abonne.email)}&event=${EVENT_ABO_ID}&top=10`,
      { headers: { "Authorization": `Bearer ${TICKIE_API_KEY}`, "Content-Type": "application/json" } }
    );

    if (!tickieRes.ok) {
      console.error("Tickie error:", await tickieRes.text());
      return new Response(
        JSON.stringify({ error: "Ticket Tickie non trouvé", email: abonne.email }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tickieData = await tickieRes.json();
    const tickets = tickieData.rows || tickieData || [];

    if (!tickets.length) {
      // Essai sans filtre event (pour trouver n'importe quel ticket de cet abonné)
      const tickieRes2 = await fetch(
        `${TICKIE_BASE}/tickets?email=${encodeURIComponent(abonne.email)}&top=20`,
        { headers: { "Authorization": `Bearer ${TICKIE_API_KEY}` } }
      );
      const data2 = await tickieRes2.json();
      const tickets2 = data2.rows || data2 || [];

      if (!tickets2.length) {
        return new Response(
          JSON.stringify({ error: "Aucun billet Tickie trouvé pour cet email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prendre le ticket abonnement (filtrer par nom du ticket)
      const aboTicket = tickets2.find((t: any) => 
        /abonn|commandant|pilote|spationaute|réabonn|cse/i.test(t.ticketName || t.name || "")
      ) || tickets2[0];

      const barcode = aboTicket._id || aboTicket.id || aboTicket.barcode;

      // Sauvegarder en cache dans Supabase
      await supabaseAdmin.from("abonnes").update({ 
        tickie_ticket_id: barcode 
      }).eq("id", abonne.id);

      return new Response(
        JSON.stringify({ 
          barcode,
          ticket_name: aboTicket.ticketName || aboTicket.name,
          status: aboTicket.status,
          source: "tickie_live"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Ticket trouvé → extraire le barcode ───────────────
    const ticket = tickets[0];
    const barcode = ticket._id || ticket.id || ticket.barcode || ticket.code;

    // Sauvegarder en cache
    await supabaseAdmin.from("abonnes").update({ 
      tickie_ticket_id: barcode 
    }).eq("id", abonne.id);

    return new Response(
      JSON.stringify({ 
        barcode,
        ticket_name: ticket.ticketName || ticket.name,
        status: ticket.status,
        category: ticket.categoryName,
        source: "tickie_live"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erreur get-ticket-qr:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
