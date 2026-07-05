# Documentation de `index.html`

## Role du fichier

`index.html` est le document HTML de base charge par Vite. Il ne contient pas l'application elle-meme, mais il prepare la page dans laquelle React va se monter.

## Detail des elements

### `<!doctype html>`

Indique au navigateur qu'il doit interpreter la page selon les standards HTML5.

### `<html lang="en">`

Declare la langue du document. La valeur actuelle est `en`, meme si l'interface affichee est maintenant majoritairement en francais. Si vous voulez aligner le document avec le contenu, `fr` serait plus coherent.

### `<meta charset="UTF-8" />`

Permet de gerer correctement les caracteres Unicode.

### `<link rel="icon" ... href="/favicon.svg" />`

Associe le favicon SVG du projet a l'onglet du navigateur.

### `<meta name="viewport" ... />`

Assure un comportement responsive correct sur mobile et tablette.

### `<title>maxcanva</title>`

Definit le titre de l'onglet navigateur.

### `<div id="root"></div>`

C'est le conteneur vide dans lequel React injecte l'application a l'execution.

### `<script type="module" src="/src/main.jsx"></script>`

Charge le point d'entree JavaScript de l'application via le systeme de modules ES de Vite.

## Resume

`index.html` est un squelette minimal. Toute la logique UI est ensuite delegatee a `main.jsx` puis `App.jsx`.