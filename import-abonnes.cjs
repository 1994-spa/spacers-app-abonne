const fs = require("fs");
const path = require("path");

const raw  = fs.readFileSync(path.join(__dirname, "tickets.json"), "utf8");
const data = JSON.parse(raw);
const tickets = data.rows || data || [];

console.log(`📊 ${tickets.length} billets lus depuis Tickie`);

function mapFormule(ticketName) {
  const n = (ticketName || "").toLowerCase();
  if (n.includes("commandant"))                                                  return "Commandant";
  if (n.includes("pilote"))                                                      return "Pilote";
  if (n.includes("spationaute"))                                                 return "Spationaute";
  if (n.includes("etudiant - cse") || n.includes("étudiant - cse"))             return "Partenaire CSE Étudiant";
  if (n.includes("fan - cse"))                                                   return "Partenaire CSE Fan";
  if (n.includes("essentiel - cse"))                                             return "Partenaire CSE Essentiel";
  if (n.includes("reabonnement etudiant") || n.includes("réabonnement étudiant")) return "Réabonnement Étudiant";
  if (n.includes("reabonnement") || n.includes("réabonnement"))                  return "Réabonnement";
  return "Commandant";
}

function esc(str) {
  if (!str && str !== 0) return "NULL";
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// Tous les tickets valides — 1 barcode = 1 abonné (pas de dédup email)
const valid = tickets.filter(t =>
  t.barcode &&
  (t.status === "VALID" || t.status === "DETAILSREQUIRED")
);

console.log(`✅ ${valid.length} billets valides avec barcode`);

const stats = {};
valid.forEach(t => { const f = mapFormule(t.ticketName); stats[f] = (stats[f]||0)+1; });
console.log("\n📋 Répartition par formule :");
Object.entries(stats).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

const valueLines = valid.map(t => {
  const prenom  = esc(t.firstname || t.name?.split(" ")[0] || "Abonné");
  const nom     = esc(t.lastname  || t.name?.split(" ").slice(1).join(" ") || "");
  const email   = esc((t.email || "").toLowerCase().trim());
  const formule = esc(mapFormule(t.ticketName));
  const barcode = esc(t.barcode);
  const orderId = esc(t.transactionId);
  const statut  = t.status === "VALID" ? "'actif'" : "'en_attente'";
  const tribune = esc(t.seatingInfo?.sectionName || "");
  const siege   = esc([t.seatingInfo?.rowName, t.seatingInfo?.seatName].filter(Boolean).join(""));
  return `  (${prenom}, ${nom}, ${email}, ${formule}, '2026-27', ${barcode}, ${orderId}, ${statut}, ${tribune}, ${siege})`;
});

const sql = [
  "-- ============================================================",
  "-- IMPORT ABONNÉS TICKIE · " + valid.length + " billets · Saison 2026-27",
  "-- 1 barcode Tickie = 1 abonné unique",
  "-- ============================================================",
  "",
  "INSERT INTO public.abonnes (",
  "  prenom, nom, email, formule, saison,",
  "  tickie_ticket_id, tickie_order_id, statut,",
  "  tribune, siege",
  ") VALUES",
  valueLines.join(",\n"),
  "ON CONFLICT (tickie_ticket_id) DO UPDATE SET",
  "  prenom   = EXCLUDED.prenom,",
  "  nom      = EXCLUDED.nom,",
  "  email    = EXCLUDED.email,",
  "  formule  = EXCLUDED.formule,",
  "  statut   = EXCLUDED.statut,",
  "  tribune  = EXCLUDED.tribune,",
  "  siege    = EXCLUDED.siege,",
  "  updated_at = now();",
  "",
  "-- Résultat",
  "SELECT count(*), statut, formule",
  "FROM public.abonnes",
  "GROUP BY statut, formule",
  "ORDER BY count(*) DESC;",
].join("\n");

fs.writeFileSync(path.join(__dirname, "import-abonnes.sql"), sql, "utf8");
console.log(`\n✅ import-abonnes.sql généré · ${valid.length} abonnés`);
