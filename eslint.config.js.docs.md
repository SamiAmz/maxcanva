# Documentation de `eslint.config.js`

## Role du fichier

`eslint.config.js` definit les regles de lint du projet. Son objectif est de detecter automatiquement des erreurs probables, des oublis et certains patterns fragiles dans le code JavaScript et JSX.

## Imports

### `@eslint/js`

Fournit la configuration recommandee de base pour JavaScript.

### `globals`

Permet de declarer les variables globales reconnues par l'environnement cible, ici le navigateur.

### `eslint-plugin-react-hooks`

Ajoute les regles specifiques a React Hooks pour eviter des erreurs comme des dependances manquantes dans `useEffect`.

### `eslint-plugin-react-refresh`

Ajoute des regles utiles au fonctionnement correct du rafraichissement a chaud avec Vite.

### `defineConfig` et `globalIgnores`

Helpers modernes pour ecrire une configuration ESLint plate et lisible.

## Configuration exportee

Le fichier exporte un tableau de configuration compose de plusieurs blocs.

### `globalIgnores(['dist'])`

Demande a ESLint d'ignorer le dossier de build `dist`, qui contient des artefacts generes et non du code source a maintenir a la main.

### Bloc principal `files: ['**/*.{js,jsx}']`

Indique que les regles suivantes s'appliquent aux fichiers JavaScript et JSX du projet.

### `extends`

Agrege trois sources de regles:

- les recommandations JavaScript de base;
- les recommandations pour les hooks React;
- les regles adaptees a React Refresh dans Vite.

### `languageOptions.globals = globals.browser`

Autorise les variables globales disponibles dans un navigateur, par exemple `window`, `document` ou `console`, sans les traiter comme inconnues.

### `parserOptions: { ecmaFeatures: { jsx: true } }`

Active explicitement le support JSX dans les fichiers analyses.

## Resume

`eslint.config.js` ne change pas le comportement de l'application en execution. Il sert a maintenir une base de code plus sure et plus coherente pendant le developpement.