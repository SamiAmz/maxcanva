# Infrastructure du client

Ce dossier accueillera uniquement les adaptateurs concrets des ports définis
dans `application/ports`.

- `persistence/indexed-db/` : sauvegarde locale automatique.
- `persistence/file/` : import et export d'un `ProjectDocument`.
- `http/` : client HTTP commun, gestion des erreurs et cookies de session.
- `projects/` : implémentation HTTP de `ProjectRepository`.
- `auth/` : implémentation HTTP de `AuthGateway`.
- `assistant/` : implémentation HTTP de `AssistantGateway`.

Les composants React et le store ne doivent pas importer directement une
bibliothèque de stockage, le SDK d'un LLM ou des détails d'authentification.
Les adaptateurs seront assemblés dans `app/` lorsque les fonctionnalités seront
implémentées.
