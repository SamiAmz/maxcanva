# Architecture de MaxCanva

## Objectif

La structure prépare trois évolutions sans les implémenter :

1. sauvegarde locale, import/export de fichier ou persistance web;
2. comptes utilisateurs et sessions;
3. assistant LLM capable de proposer la création ou la modification d'un
   prototype.

Le comportement actuel de l'éditeur reste entièrement côté client.

## Workspaces

### `client`

Le client suit quatre couches :

- `app/` assemble l'interface et, plus tard, les adaptateurs;
- `features/` contient les composants et le store propres à l'expérience
  d'édition;
- `domain/` contient les règles pures qui ne dépendent ni de React, ni de
  Zustand, ni du réseau;
- `application/ports/` définit ce dont l'application a besoin du monde
  extérieur.

`infrastructure/` accueillera les implémentations concrètes : IndexedDB, fichier
JSON et appels HTTP. Aucun composant React ne devra importer directement ces
détails.

### `shared`

Le package partagé est la seule source de vérité pour les données qui traversent
une frontière :

- `ProjectDocument` est le format de fichier et de sauvegarde, avec
  `schemaVersion`;
- `StoredProject` ajoute l'identité, le propriétaire, la révision et les dates;
- les contrats d'authentification décrivent l'utilisateur et la session;
- `AssistantRequest` et `AssistantChangeSet` imposent au LLM des commandes
  structurées.

À la première évolution incompatible du document, il faudra ajouter une
migration plutôt que modifier silencieusement la version existante.

### `server`

Le serveur est découpé par capacité métier :

- `modules/auth/` : utilisateurs, hachage des mots de passe et sessions;
- `modules/projects/` : stockage, révisions et contrôle du propriétaire;
- `modules/assistant/` : appel au fournisseur LLM et validation du résultat.

Seuls les ports existent actuellement. Le framework HTTP, la base de données,
la stratégie de session et le fournisseur LLM seront choisis au moment de
l'implémentation; aucun package spéculatif n'est installé.

## Direction des dépendances

```text
client UI ──> client domain ──> shared contracts
    │
    └──────> client application ports <── client infrastructure (future)

server adapters (future) ──> server module ports ──> shared contracts
```

Le client ne dépend jamais du serveur. Les deux dépendent du package partagé.
Le package partagé ne dépend d'aucun framework.

## Préparation de la persistance

`toProjectDocument` sépare déjà les données sauvegardables de l'état temporaire
de l'éditeur. `ProjectRepository` permet une implémentation IndexedDB ou HTTP,
tandis que `ProjectFileGateway` couvre l'import/export local.

Lors de l'implémentation, il faudra ajouter la validation du document, les
migrations, l'état `saving/saved/error`, le chargement dans le store et une
stratégie de conflit fondée sur `revision`.

## Préparation de l'authentification

Le client possède un `AuthGateway`; le serveur possède des ports distincts pour
les utilisateurs, le hachage et les sessions. L'autorisation des projets exige
un `ownerId` à chaque opération du repository serveur.

La future session devrait être conservée dans un cookie `httpOnly` et `secure`.
Les composants ne devront jamais manipuler un hash ou un secret.

## Préparation de l'assistant LLM

Le navigateur appellera uniquement le serveur via `AssistantGateway`. La clé du
fournisseur restera côté serveur. Le LLM renverra un `AssistantChangeSet`
composé de `PrototypeCommand`, pas une copie arbitraire du store Zustand.

Avant application, le serveur devra valider la structure et les autorisations;
le client devra ensuite appliquer tout le lot comme une seule opération
annulable et permettre à l'utilisateur de le confirmer.

## Éléments volontairement absents

- aucun endpoint HTTP;
- aucune base de données ni sauvegarde locale;
- aucun formulaire de connexion;
- aucun appel à un LLM;
- aucun SDK de fournisseur installé;
- aucun test ajouté dans cette préparation.
