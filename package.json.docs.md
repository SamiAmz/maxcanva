# Documentation de `package.json`

## Role du fichier

`package.json` decrit le projet Node.js et front-end. Il sert a declarer:

- l'identite du package;
- les scripts de travail;
- les dependances de runtime;
- les dependances de developpement.

## Champs principaux

### `name: "maxcanva"`

Nom logique du projet.

### `private: true`

Indique que ce package n'est pas destine a etre publie tel quel sur npm. Cela evite des publications accidentelles.

### `version: "0.0.0"`

Version actuelle du projet. Ici, la valeur est surtout indicative.

### `type: "module"`

Active le mode ECMAScript Modules dans l'environnement Node utilise par les outils du projet.

## Scripts

### `dev: "vite"`

Lance le serveur de developpement Vite. C'est la commande a utiliser pour travailler interacti vement sur l'application.

### `build: "vite build"`

Construit la version de production du projet dans le dossier `dist`.

### `lint: "eslint ."`

Analyse le projet avec ESLint.

### `preview: "vite preview"`

Permet de lancer localement un serveur qui sert la version de production deja construite.

## Dependances

### `react`

Bibliotheque d'interface utilisateur utilisee pour construire l'application.

### `react-dom`

Permet d'attacher React au DOM du navigateur.

### `konva`

Bibliotheque orientee canvas utilisee habituellement pour des interfaces graphiques plus riches. Dans l'etat actuel du projet, elle est installee mais non utilisee par le code source principal. Elle peut donc etre consideree comme une dependance reservee a une evolution future ou comme un reliquat a nettoyer.

## Dependances de developpement

### `vite`

Outil de developpement et de build.

### `@vitejs/plugin-react`

Plugin React officiel pour Vite.

### `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`

Ensemble des outils de lint.

### `globals`

Liste standard de variables globales reutilisee par ESLint.

### `@types/react`, `@types/react-dom`

Definitions de types utiles a l'ecosysteme outillage, meme si le projet n'est pas en TypeScript.

## Resume

`package.json` centralise tout ce qui permet d'installer, lancer, verifier et construire MaxCanva.