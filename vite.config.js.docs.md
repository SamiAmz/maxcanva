# Documentation de `vite.config.js`

## Role du fichier

`vite.config.js` configure Vite, l'outil qui gere:

- le serveur de developpement;
- le bundling de production;
- la resolution des modules;
- les plugins de build.

## Detail du contenu

### `import { defineConfig } from 'vite'`

Importe le helper officiel qui permet d'ecrire une configuration Vite avec autocompletion et meilleure lisibilite.

### `import react from '@vitejs/plugin-react'`

Importe le plugin React officiel. Ce plugin apporte notamment:

- le support JSX;
- l'integration React avec Vite;
- le rafraichissement a chaud en developpement.

### `export default defineConfig({ plugins: [react()] })`

Exporte la configuration active du projet. Ici, elle est volontairement minimale: Vite demarre avec le plugin React et sans personnalisation supplementaire.

## Ce que cela implique pour le projet

- `npm run dev` lance un serveur Vite pour l'application React.
- `npm run build` produit une version optimisee dans `dist`.
- Les fichiers `.jsx` sont compris nativement grace au plugin.

## Resume

`vite.config.js` est volontairement simple. Il active juste l'infrastructure Vite necessaire a MaxCanva sans surcharge de configuration.