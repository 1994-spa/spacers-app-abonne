// ============================================================
// EDGE FUNCTION : birthday-emails
// Envoi automatique de l'email d'anniversaire (déclenché par pg_cron).
// Déployer sur le projet ABONNÉS (usdtgkzfmwmbrezgtaki).
//
// Chemin conseillé : supabase/functions/birthday-emails/index.ts
//
// Variables d'environnement (secrets) à définir :
//   - RESEND_API_KEY  : ta clé API Resend (re_...)
//   - CRON_SECRET     : une chaîne secrète au choix (sert à protéger l'appel)
// (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement.)
// ============================================================

Deno.serve(async (req) => {
  // 1) Sécurité : on n'accepte que les appels portant le bon secret.
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  if (CRON_SECRET && req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const RESEND_KEY   = Deno.env.get("RESEND_API_KEY");
  const APP_URL = "https://abonnes.spacerstoulouse.fr";
  const FROM    = "Spacer's Toulouse Volley <marketing@spacerstoulouse.fr>";

  if (!RESEND_KEY) return json({ error: "RESEND_API_KEY manquante" }, 500);

  // 2) Date du jour en heure de Paris (YYYY-MM-DD) -> MM-DD
  const parisDate = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const year = Number(parisDate.slice(0, 4));
  const mmdd = parisDate.slice(5); // "MM-DD"

  // 3) Lire les abonnés (service role -> contourne la RLS)
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/abonnes?select=id,prenom,email,date_naissance,anniv_email_year&date_naissance=not.is.null&email=not.is.null`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  if (!r.ok) return json({ error: "lecture abonnes " + r.status }, 500);
  const abonnes = await r.json();

  // 4) Filtrer : anniversaire aujourd'hui ET pas déjà notifié cette année
  const cibles = (abonnes as Array<Record<string, unknown>>).filter((a) =>
    String(a.date_naissance).slice(5, 10) === mmdd && a.anniv_email_year !== year
  );

  let sent = 0;
  const errors: string[] = [];

  for (const a of cibles) {
    const prenom = String(a.prenom ?? "");
    const email  = String(a.email ?? "");
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: `🎉 Joyeux anniversaire ${prenom} !`,
          html: emailHtml(prenom, APP_URL),
        }),
      });
      if (!res.ok) { errors.push(`${email}: ${res.status} ${await res.text()}`); continue; }

      // Marquer comme notifié cette année (anti-doublon)
      await fetch(`${SUPABASE_URL}/rest/v1/abonnes?id=eq.${a.id}`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json", Prefer: "return=minimal",
        },
        body: JSON.stringify({ anniv_email_year: year }),
      });
      sent++;
    } catch (e) {
      errors.push(`${email}: ${String(e)}`);
    }
  }

  return json({ date: parisDate, candidates: cibles.length, sent, errors });
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

function emailHtml(prenom: string, appUrl: string) {
  return `
  <div style="background:#001E2D;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0A2A3A;border-radius:16px;padding:28px;color:#ffffff;">
      <div style="font-size:24px;font-weight:bold;color:#E8C15A;margin-bottom:14px;">🎉 Joyeux anniversaire ${prenom} !</div>
      <p style="font-size:15px;line-height:1.6;color:#C8D2EB;margin:0 0 14px;">Toute l'équipe des Spacer's Toulouse Volley te souhaite une superbe journée 🏐</p>
      <p style="font-size:15px;line-height:1.6;color:#C8D2EB;margin:0 0 20px;">Ouvre ton appli abonné : une petite surprise t'y attend aujourd'hui.</p>
      <a href="${appUrl}" style="display:inline-block;background:#91BEE6;color:#001E2D;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px;font-size:14px;">Ouvrir mon appli</a>
      <p style="font-size:12px;color:#6B7B8C;margin:26px 0 0;">Spacer's Toulouse Volley · Palais des sports André Brouat</p>
    </div>
  </div>`;
}
