-- ============================================================
-- RATTRAPAGE — créer les codes Vivenu des abonnés EXISTANTS
-- Projet ABONNÉS (usdtgkzfmwmbrezgtaki) — SQL Editor.
--
-- À lancer UNE fois, après :
--   1) déploiement de la fonction parrainage-tickie
--   2) secret VIVENU_API_KEY défini
--   3) endpoint Vivenu confirmé (réponse Nidhal)
--
-- La fonction traite jusqu'à 100 abonnés par appel (BATCH_LIMIT).
-- S'il en reste, relance simplement ce bloc.
-- ============================================================

-- Par défaut : seulement les profils complétés (comme le trigger).
select net.http_post(
  url := 'https://usdtgkzfmwmbrezgtaki.supabase.co/functions/v1/parrainage-tickie',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZHRna3pmbXdtYnJlemd0YWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODIxMTQsImV4cCI6MjA5Nzg1ODExNH0.o_CxZcM_k_if3q3tziXF4O85KzXaJ7MhfkXP0esvvGk'
  ),
  body := '{}'::jsonb
);

-- VARIANTE : inclure aussi les abonnés dont le profil n'est PAS
-- encore complété (utile si tu veux que TOUS aient un code dès
-- maintenant). Décommente la ligne body ci-dessous à la place.
--   body := '{"include_incomplete": true}'::jsonb

-- ============================================================
-- SUIVI après exécution :
--   -- combien ont un code créé / une erreur / rien :
--   select
--     count(*) filter (where vivenu_discount_id is not null) as crees,
--     count(*) filter (where vivenu_discount_error is not null) as erreurs,
--     count(*) filter (where vivenu_discount_id is null
--                       and code_parrainage is not null
--                       and profil_complete) as restants
--   from abonnes;
--
--   -- détail des erreurs éventuelles :
--   select id, prenom, nom, vivenu_discount_error
--   from abonnes where vivenu_discount_error is not null;
--
-- (Alternative au SQL : page Edge Functions > parrainage-tickie >
--  bouton "Invoke" avec le body {} — même effet.)
-- ============================================================
