# Documentation de `App.css`

## Role du fichier

`App.css` contient tous les styles visuels de l'application MaxCanva. Il definit:

- la disposition generale en trois panneaux;
- le style du canevas de dessin;
- l'apparence des boutons et formulaires;
- l'etat visuel des selections et des interactions;
- l'interface de simulation;
- les adaptations responsive.

## Organisation des styles

Le fichier est structure par grandes zones de l'interface.

## `.app-shell`

Definit la structure principale de la page avec une grille a trois colonnes:

- panneau gauche;
- zone de travail centrale;
- panneau droit.

Le fond combine un degrade et un halo radial pour eviter un rendu trop plat.

## `.panel`, `.panel--left`, `.panel--right`

Ces classes stylisent les colonnes laterales:

- padding confortable;
- fond semi-transparent;
- effet de flou de fond;
- traits de separation entre les panneaux.

`.panel--right` utilise une teinte legerement differente pour bien distinguer la zone de configuration et de simulation.

## Blocs textuels

### `.panel__section`

Ajoute un espacement vertical constant entre les sections internes d'un panneau.

### `.eyebrow` et `.workspace__label`

Servent a afficher de petits titres secondaires en majuscules espacées.

### `.panel__text` et `.panel__hint`

Definissent des styles de texte descriptif et d'aide contextuelle.

## Barre d'entete et zone centrale

### `.panel__heading-row` et `.workspace__toolbar`

Creent des lignes horizontales pour aligner un titre avec des actions a droite.

### `.workspace`

Definit la colonne centrale de travail en flex vertical.

### `.workspace__stats`

Affiche les compteurs de contenus et de liens sous forme de pastilles.

## Cadre du canevas

### `.canvas-frame`

Encadre le SVG principal avec:

- un fond clair;
- un grand rayon de bord;
- une ombre portee;
- un remplissage interne.

### `.drawing-surface` et `.simulation-surface`

Appliquent les dimensions et la forme generale du canevas de dessin et du canevas de simulation.

### `.drawing-surface.is-pen`

En pratique, l'etat du crayon est signale par le curseur `crosshair`.

## Fond et grille

### `.drawing-surface__bg` et `.screen-miniature__bg`

Colorent le fond des canevas principaux et des miniatures.

### `.drawing-surface__grid line`

Stylise les lignes de grille avec une opacite faible pour qu'elles servent d'aide sans devenir dominantes.

## Traits dessines

### `.canvas-stroke`

Definit la couleur par defaut des polylignes dessinees.

### `.canvas-stroke.is-selected` et `.canvas-stroke--draft`

Colorent la selection et le trait temporaire dans une teinte orange afin de les distinguer clairement du contenu normal.

## Selection et zones interactives

### `.selection-outline`

Affiche un rectangle en pointilles autour d'un contenu selectionne.

### `.interaction-outline`

Affiche la zone d'une interaction creee dans l'editeur. Le fond est tres legerement colore pour signaler une surface interactive sans masquer le dessin.

### `.interaction-outline.is-active`

Renforce le contour de l'interaction actuellement associee a la selection courante.

### `.interaction-tag text`

Stylise le libelle `Bouton` ou `Hyperlien` affiche sur le canevas.

### `.marquee-selection`

Represente le rectangle de selection multiple lors d'un glisser sur le canevas.

## Boutons et controles

### `.tool-grid`

Organise les outils principaux en grille de trois colonnes.

### `.tool-button`, `.ghost-button`, `.primary-button`, `.secondary-button`, `.screen-card__open`

Partagent un socle commun:

- bords arrondis;
- padding uniforme;
- poids typographique semi-gras;
- animation au survol.

### `.tool-button`

Style standard pour les boutons d'outil.

### `.tool-button.is-active`

Met en avant l'outil actif avec un fond sombre et un texte clair.

### `.tool-button--danger`

Signale visuellement une action de suppression.

### Etats `:hover` et `:disabled`

Le survol applique un petit decalage vertical. Les etats desactives reduisent l'opacite et retirent l'impression d'interactivite.

### `.ghost-button`, `.secondary-button`, `.screen-card__open`

Variantes plus neutres pour les actions secondaires.

### `.primary-button`

Bouton d'action principale, utilise notamment pour creer un lien ou demarrer la simulation.

## Champs de formulaire

### `.field`

Organise un label et son controle dans une petite grille verticale.

### `.field span`

Stylise les libelles des champs `Type` et `Destination`.

### `.field select` et `.screen-card__name`

Partagent un style commun pour les selects et les champs de renommage des fenetres.

## Liste des fenetres

### `.screen-list`

Affiche les cartes de fenetres avec un espacement regulier.

### `.screen-card`

Style une fenetre dans la colonne de gauche comme une carte distincte.

### `.screen-card.is-active`

Met en evidence la fenetre actuellement ouverte dans l'editeur.

### `.screen-card__index`

Affiche le numero de la fenetre dans une pastille.

### `.screen-card__preview` et `.screen-miniature`

Encadrent et dimensionnent l'apercu SVG miniature.

### `.screen-card__open`

Positionne le bouton d'ouverture de la fenetre sur la droite de la carte.

## Mode simulation

### `.simulation-shell`

Empile verticalement les composants du mode simulation.

### `.simulation-shell__header`

Affiche le statut `Lecture utilisateur` et le nom de la fenetre courante.

### `.simulation-empty-state`

Cadre l'etat vide qui invite l'utilisateur a lancer la simulation.

### `.simulation-hitbox`

Style les rectangles cliquables poses sur les contenus interactifs en simulation.

### `.simulation-hitbox.is-hovered`

Applique la surbrillance demandee pendant le survol.

### `.simulation-label` et `.simulation-label.is-hovered`

Affichent le type d'interaction sous la zone cliquable et accentuent la lecture au survol.

## Responsive

### Media query `max-width: 1260px`

Passe d'une grille a trois colonnes a une grille a deux colonnes, puis place le panneau droit sur toute la largeur en dessous.

### Media query `max-width: 920px`

Empile tous les panneaux en une seule colonne et reduit les espacements pour mobile ou petite tablette.

## Resume

`App.css` ne contient pas de logique applicative, mais il transforme la structure HTML et SVG de `App.jsx` en une interface lisible, differenciee et exploitable, aussi bien en edition qu'en simulation.