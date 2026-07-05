# Documentation de `main.jsx`

## Role du fichier

`main.jsx` est le point d'entree front-end de l'application React. C'est lui qui attache l'application MaxCanva au document HTML.

## Ligne par ligne

### `import { StrictMode } from 'react'`

Importe `StrictMode`, un outil React de developpement qui aide a detecter certains usages fragiles ou non recommandes.

### `import { createRoot } from 'react-dom/client'`

Importe l'API React moderne pour monter une application dans le DOM.

### `import './index.css'`

Charge les styles globaux de base avant le rendu de l'application.

### `import App from './App.jsx'`

Importe le composant principal qui contient toute la logique de l'outil de prototypage.

### `createRoot(document.getElementById('root')).render(...)`

Recupere le noeud HTML `#root` declare dans `index.html`, cree une racine React, puis rend le composant `App` a l'interieur.

### `<StrictMode><App /></StrictMode>`

Encapsule l'application pour obtenir des verifications supplementaires en developpement. Cela n'ajoute pas de fonctionnalite visible pour l'utilisateur final, mais aide a maintenir un code plus robuste.

## Resume

`main.jsx` sert uniquement de pont entre le navigateur, `index.html`, les styles globaux et le composant principal React.