# Documentation de `public/favicon.svg`

## Role du fichier

`public/favicon.svg` est l'icone affichee dans l'onglet du navigateur et parfois dans les favoris ou raccourcis du site.

## Ce que contient le SVG

Le fichier decrit une icone vectorielle complexe issue du template Vite:

- une forme principale violette;
- un masque SVG;
- plusieurs ellipses et filtres pour les reflets et volumes.

Ce n'est pas un simple pictogramme aplat, mais une petite composition vectorielle stylisee.

## Comment il est utilise

Le fichier est reference par `index.html` via la balise `link rel="icon"`.

Comme il se trouve dans `public`, Vite le sert tel quel a la racine de l'application sous `/favicon.svg`.

## Impact sur l'application

Ce fichier n'a aucun effet sur la logique metier de MaxCanva. Son role est purement identitaire et visuel.

## Resume

`favicon.svg` est une ressource statique decorative provenant du scaffold Vite et utilisee comme icone de l'application dans le navigateur.