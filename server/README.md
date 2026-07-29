# Serveur MaxCanva

Le serveur est préparé en modules indépendants, sans implémentation HTTP,
base de données ou fournisseur LLM pour le moment.

```text
src/modules/
├── auth/         Comptes, mots de passe et sessions
├── projects/     Persistance et autorisation des prototypes
└── assistant/    Génération de changements structurés par un LLM
```

Chaque module expose d'abord ses ports applicatifs. Les futurs adaptateurs
(`http`, `database`, `openai`, etc.) devront implémenter ces interfaces.
Le navigateur ne devra jamais recevoir une clé de fournisseur LLM, un hash de
mot de passe ou une logique d'autorisation.
