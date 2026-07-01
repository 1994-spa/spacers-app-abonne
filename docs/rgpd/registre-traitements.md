# Registre des activités de traitement — Application abonnés

**Responsable du traitement** : Spacer's Toulouse Volley — _[À COMPLÉTER : dénomination légale, forme juridique, adresse du siège, SIRET]_
**Point de contact données personnelles** : contact@spacerstoulouse.fr
**Date du registre** : 1er juillet 2026
**Version** : 1.0

Ce registre recense les traitements de données personnelles opérés via l'application abonnés, conformément à l'article 30 du RGPD. Hébergement principal : Supabase (Irlande, Union européenne).

> ⚠️ **Public concerné** : les abonnés peuvent inclure des **mineurs** disposant de leur propre compte. Chaque traitement doit être lu à la lumière de la note « Mineurs » en fin de registre (consentement parental sous 15 ans, aucune prospection commerciale envers les mineurs).

---

## Traitement n°1 — Gestion des abonnés et accès à l'application

| Champ | Description |
|---|---|
| **Finalité** | Gérer les comptes abonnés, authentifier les personnes, donner accès à l'espace abonné |
| **Personnes concernées** | Abonnés du Club (mineurs et majeurs) |
| **Catégories de données** | Civilité, prénom, nom, date de naissance, email, téléphone, adresse postale, formule, saison, statut |
| **Base légale** | Exécution du contrat (abonnement) — Art. 6.1.b RGPD |
| **Durée de conservation** | Durée de l'abonnement, puis _[À CONFIRMER : ex. 3 ans]_ après le dernier abonnement, puis anonymisation ou suppression |
| **Destinataires internes** | Administration du Club |
| **Sous-traitants** | Supabase (BDD + authentification, Irlande UE) |
| **Sécurité** | RLS : chaque abonné n'accède qu'à sa propre fiche. Verrou au niveau colonne interdisant la modification des champs sensibles (is_admin, points, compteurs) depuis le client. |

---

## Traitement n°2 — Billetterie et accès au match

| Champ | Description |
|---|---|
| **Finalité** | Permettre l'accès au match via le billet / QR code de l'abonné |
| **Personnes concernées** | Abonnés |
| **Catégories de données** | Identifiant de billet, code-barres, identifiant de commande, siège, tribune |
| **Base légale** | Exécution du contrat — Art. 6.1.b RGPD |
| **Durée de conservation** | Durée de l'abonnement / de la saison concernée |
| **Destinataires internes** | Administration, contrôle d'accès |
| **Sous-traitants** | Tickie / Vivenu (billetterie), Supabase (Irlande UE) |
| **Sécurité** | Lecture restreinte à la fiche de l'abonné. Génération du QR côté client à partir de sa propre donnée. |

---

## Traitement n°3 — Gamification et fidélité

| Champ | Description |
|---|---|
| **Finalité** | Animer l'espace abonné : points, paliers, badges, pronostics, présences, préférences |
| **Personnes concernées** | Abonnés |
| **Catégories de données** | Points (buvette, boutique, parrainage), palier, niveau, badges, nombre d'achats, pronostics, présences déclarées, centres d'intérêt, joueur préféré, mode de transport |
| **Base légale** | Intérêt légitime (fidélisation, vie du club) — Art. 6.1.f RGPD |
| **Durée de conservation** | Durée de vie du compte |
| **Destinataires internes** | Administration |
| **Sous-traitants** | Supabase (Irlande UE) |
| **Sécurité** | Points et compteurs attribués côté serveur (triggers / edge functions), non modifiables par l'abonné. |

---

## Traitement n°4 — Transactions buvette / boutique (comptabilité)

| Champ | Description |
|---|---|
| **Finalité** | Enregistrer les achats pour l'attribution de points et la tenue de la comptabilité |
| **Personnes concernées** | Abonnés ayant effectué un achat |
| **Catégories de données** | Montant TTC, produits, horodatage, identifiant de l'abonné |
| **Base légale** | Exécution du contrat / Obligation légale (comptabilité) — Art. 6.1.b et 6.1.c RGPD |
| **Durée de conservation** | 10 ans (obligation légale comptable) |
| **Destinataires internes** | Administration / comptabilité |
| **Sous-traitants** | Supabase (Irlande UE) |
| **Sécurité** | RLS de lecture restreinte à l'abonné concerné ; écriture réservée au point de vente (service_role). |

---

## Traitement n°5 — Espaces communautaires

| Champ | Description |
|---|---|
| **Finalité** | Permettre aux abonnés d'échanger dans des fils de discussion modérés |
| **Personnes concernées** | Abonnés (mineurs et majeurs) |
| **Catégories de données** | Contenu des messages, identité de l'auteur, statut de modération, signalements |
| **Base légale** | Intérêt légitime (vie du club) — Art. 6.1.f RGPD |
| **Durée de conservation** | Durée de vie du compte, puis anonymisation |
| **Destinataires internes** | Community managers / modération |
| **Sous-traitants** | Supabase (Irlande UE) |
| **Sécurité** | Pas de messagerie privée. Modération et signalement disponibles. Vigilance renforcée du fait de la présence de mineurs (pas de partage de coordonnées, modération prioritaire). |

---

## Traitement n°6 — Pronostics et présences

| Champ | Description |
|---|---|
| **Finalité** | Recueillir les pronostics de match et les présences déclarées |
| **Personnes concernées** | Abonnés |
| **Catégories de données** | Pronostics, présences déclarées par match |
| **Base légale** | Intérêt légitime — Art. 6.1.f RGPD |
| **Durée de conservation** | Durée de vie du compte |
| **Destinataires internes** | Administration |
| **Sous-traitants** | Supabase (Irlande UE) |
| **Sécurité** | RLS restreinte à l'abonné concerné. |

---

## Traitement n°7 — Parrainage

| Champ | Description |
|---|---|
| **Finalité** | Gérer les invitations de parrainage et les récompenses associées |
| **Personnes concernées** | Abonnés parrains et filleuls |
| **Catégories de données** | Code de parrainage, liens parrain/filleul, nombre de filleuls, récompenses |
| **Base légale** | Consentement — Art. 6.1.a RGPD |
| **Durée de conservation** | Durée de vie du compte |
| **Destinataires internes** | Administration |
| **Sous-traitants** | Supabase (Irlande UE), Tickie / Vivenu (remise de parrainage) |
| **Sécurité** | RLS restreinte. Remises appliquées côté serveur. |

---

## Traitement n°8 — Anniversaires (vidéo)

| Champ | Description |
|---|---|
| **Finalité** | Souhaiter son anniversaire à l'abonné via une courte vidéo |
| **Personnes concernées** | Abonnés |
| **Catégories de données** | Date de naissance, vidéo d'anniversaire (chargée par le Club), email pour l'envoi |
| **Base légale** | Intérêt légitime — Art. 6.1.f RGPD |
| **Durée de conservation** | Vidéo supprimée à la clôture du compte ; envoi une fois par an |
| **Destinataires internes** | Administration |
| **Sous-traitants** | Supabase (storage privé `anniversaires`, Irlande UE), Resend (envoi email) |
| **Sécurité** | Bucket privé ; URL signée à durée limitée ; upload réservé aux admins. |

---

## Traitement n°9 — Photo de tribune

| Champ | Description |
|---|---|
| **Finalité** | Permettre à l'abonné de conserver un souvenir personnel |
| **Personnes concernées** | Abonnés qui chargent volontairement une photo |
| **Catégories de données** | Photo, horodatage |
| **Base légale** | Consentement (chargement volontaire) — Art. 6.1.a RGPD |
| **Durée de conservation** | Jusqu'à suppression par l'abonné ou clôture du compte |
| **Destinataires internes** | Abonné concerné et administration uniquement |
| **Sous-traitants** | Supabase (storage privé `tribune`, Irlande UE) |
| **Sécurité** | Bucket privé ; accès restreint au propriétaire (dossier = son identifiant) et aux admins. Pas de galerie publique. |

---

## Traitement n°10 — Historique des consentements (table `consents`)

| Champ | Description |
|---|---|
| **Finalité** | Conserver la preuve juridique horodatée de chaque consentement donné ou retiré (Art. 7.1 RGPD) |
| **Personnes concernées** | Tout abonné ayant interagi avec un consentement |
| **Catégories de données** | Email (clé persistante au-delà de la suppression du compte), type de consentement (`rgpd`, `analytics`, `marketing`, `reglement`, `parental`, `photo_tribune`, `data_export`, `deletion_request`, `deletion_cancelled`), version de la politique, état (accordé/retiré), horodatage, user-agent, métadonnées |
| **Base légale** | Obligation légale (preuve du consentement) — Art. 7.1 RGPD |
| **Durée de conservation** | 5 ans après la dernière action (prescription civile, art. 2224 Code civil). Conservé même après suppression du compte, comme preuve. |
| **Destinataires internes** | Point de contact données personnelles, en cas de demande CNIL, contentieux ou droit d'accès |
| **Sous-traitants** | Supabase (Irlande UE) |
| **Sécurité** | RLS lecture/insertion restreintes à l'email authentifié. Aucune policy UPDATE/DELETE (immuabilité). CHECK sur les valeurs autorisées de `consent_type`. |

---

## Traitement n°11 — Suppression / effacement des comptes

| Champ | Description |
|---|---|
| **Finalité** | Traiter les demandes de suppression de compte (droit à l'effacement, Art. 17) |
| **Personnes concernées** | Abonnés ayant demandé la suppression |
| **Catégories de données** | Horodatage de la demande, échéance de suppression |
| **Base légale** | Obligation légale (droit à l'effacement) — Art. 17 RGPD |
| **Durée de conservation** | Délai de grâce de 30 jours (récupération possible), puis anonymisation de la fiche + suppression du compte d'authentification et des fichiers personnels |
| **Destinataires internes** | Administration |
| **Sous-traitants** | Supabase (edge function `account-deletion` en service_role, cron quotidien, Irlande UE) |
| **Sécurité** | Échéance calculée côté serveur (trigger), non manipulable par le client. La table `consents` est préservée comme preuve. |

---

## Sous-traitants — vue consolidée

| Prestataire | Rôle | Localisation |
|---|---|---|
| Supabase | Base de données, authentification, stockage, edge functions | Irlande (UE) |
| Cloudflare | Hébergement et distribution de l'application | _[À CONFIRMER : région]_ |
| Resend | Envoi d'emails transactionnels | _[À CONFIRMER : région ; transfert hors UE le cas échéant encadré par clauses contractuelles types]_ |
| Tickie / Vivenu | Billetterie et accès | _[À CONFIRMER auprès du prestataire]_ |

---

## Note — Mineurs

Les abonnés peuvent être mineurs et disposer de leur propre compte.
- **Moins de 15 ans** : consentement parental requis (email du parent/tuteur + confirmation) avant tout accès (loi Informatique et Libertés, art. 7-1).
- **Moins de 18 ans** : aucune prospection commerciale ; l'option « Offres et actualités » est indisponible.
- Les droits (accès, rectification, effacement…) peuvent être exercés par le représentant légal.
- Vigilance de modération renforcée dans les espaces communautaires du fait de la présence de mineurs.

---

## Mises à jour du registre

| Date | Version | Modifications | Responsable |
|---|---|---|---|
| 01/07/2026 | 1.0 | Création du registre (11 traitements) | _[À COMPLÉTER]_ |
