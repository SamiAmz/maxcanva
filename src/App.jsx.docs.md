# Documentation de `App.jsx`

## Role du fichier

`App.jsx` contient toute l'application de prototypage. Il gere a la fois:

- le dessin libre au crayon;
- la gestion de plusieurs fenetres;
- la selection multiple et le deplacement des traits;
- la creation de zones interactives qui pointent vers une autre fenetre;
- le mode simulation qui permet de naviguer entre les fenetres.

Le composant principal est `App`. C'est un composant React unique qui centralise l'etat et le rendu de l'editeur.

## Structure generale

Le fichier est organise en deux parties:

1. Des fonctions utilitaires placees avant le composant React.
2. Le composant `App()` qui contient l'etat, les effets, les gestionnaires d'evenements et le rendu JSX.

## Modele de donnees

### Ecran ou fenetre

Chaque fenetre est representee par un objet contenant:

- `id`: identifiant unique de la fenetre.
- `name`: nom affichable dans la liste des fenetres.
- `items`: liste des contenus dessines dans cette fenetre.
- `interactions`: liste des zones interactives definies dans cette fenetre.

### Contenu dessine

Chaque trait dessine est represente par:

- `id`: identifiant unique du trait.
- `type`: ici `stroke`.
- `points`: liste des points du polyline SVG.
- `bounds`: rectangle englobant calcule a partir des points.

Le rectangle englobant est important pour:

- la selection par zone;
- le deplacement;
- la construction des zones cliquables.

### Interaction

Une interaction represente un bouton ou un hyperlien logique construit a partir d'un ou plusieurs traits selectionnes.

Chaque interaction contient:

- `id`: identifiant unique.
- `itemIds`: liste des traits associes a l'interaction.
- `kind`: `button` ou `link`.
- `targetScreenId`: identifiant de la fenetre de destination.
- `bounds`: rectangle global qui englobe tous les traits concernes.

## Fonctions utilitaires

### `createScreen(index)`

Construit une nouvelle fenetre vide avec un nom par defaut du type `Fenetre 1`, `Fenetre 2`, etc.

### `distance(pointA, pointB)`

Retourne la distance euclidienne entre deux points. Cette fonction sert a filtrer les points trop proches pendant le dessin pour eviter des donnees trop bruitees.

### `getBoundsFromPoints(points)`

Calcule le rectangle minimum qui contient tous les points d'un trait. Le resultat contient `minX`, `maxX`, `minY`, `maxY`.

### `translateBounds(bounds, deltaX, deltaY)`

Deplace un rectangle existant de `deltaX` et `deltaY`. Utilise pendant le drag and drop des contenus.

### `mergeBounds(boundsList)`

Fusionne plusieurs rectangles en un seul grand rectangle. Sert a construire la zone cliquable d'une interaction qui recouvre plusieurs contenus.

### `boundsIntersect(a, b)`

Indique si deux rectangles se chevauchent. Utilise pour la selection par glisser-deposer.

### `normalizeBounds(start, end)`

Transforme deux points quelconques en rectangle normalise. Cela permet de dessiner correctement une zone de selection meme si l'utilisateur glisse dans un sens inverse.

### `pointToString(points)`

Transforme un tableau de points en chaine SVG exploitable par l'attribut `points` d'un `polyline`.

### `createInteraction({ itemIds, kind, targetScreenId, items })`

Construit l'objet interaction a partir de la selection actuelle. Cette fonction recalcule la zone englobante a partir des contenus associes.

## Etat React principal

### `screens`

Contient toutes les fenetres du projet.

### `activeScreenId`

Identifie la fenetre actuellement modifiable dans l'editeur.

### `tool`

Stocke l'outil actif. Les deux valeurs utilisees ici sont `pen` et `select`.

### `selectedItemIds`

Contient les identifiants des contenus actuellement selectionnes.

### `draftStroke`

Contient le trait en cours de dessin avant validation.

### `selectionRect`

Contient le rectangle de selection marquee pendant un glisser avec l'outil de selection.

### `editorLinkType`

Contient le type d'interaction a appliquer a la selection: bouton ou hyperlien.

### `editorLinkTarget`

Contient la fenetre de destination choisie pour l'interaction.

### `simulationScreenId`

Designe la fenetre actuellement affichee dans le mode simulation.

### `isSimulationMode`

Permet de basculer entre edition et simulation.

### `hoveredInteractionId`

Permet de mettre en surbrillance une interaction lors du survol en mode simulation.

### `svgRef`

Reference DOM vers le canevas SVG principal. Sert a convertir les coordonnees du pointeur en coordonnees internes du canvas.

### `pointerStateRef`

Reference mutable qui stocke l'action en cours pendant une interaction pointeur:

- dessin;
- deplacement;
- selection par zone.

Ce choix evite de re-rendre l'interface a chaque micro-changement de statut du pointeur.

## Valeurs derivees

### `activeScreen`

Recherche la fenetre active a partir de `activeScreenId`.

### `simulationScreen`

Recherche la fenetre actuellement affichee dans la simulation.

### `selectedInteraction`

Determine si la selection actuelle correspond exactement a une interaction existante. Cela permet d'afficher `Mettre a jour le lien` au lieu de `Creer le lien`.

## Effets React

### Synchronisation des identifiants actifs

Un `useEffect` verifie que `activeScreenId` et `simulationScreenId` existent toujours dans `screens`. Si une incoherence apparait, il les replace sur la premiere fenetre disponible.

### Mise a jour automatique du panneau d'interaction

Un autre `useEffect` charge automatiquement le type et la destination de l'interaction si la selection courante correspond deja a un lien configure.

### Suppression clavier

Le dernier `useEffect` ecoute `Delete` et `Backspace` pour supprimer la selection courante, sauf en mode simulation.

## Fonctions de gestion

### `updateActiveScreen(updater)`

Applique une transformation seulement a la fenetre active dans le tableau `screens`.

### `getCanvasPoint(event)`

Convertit les coordonnees ecran du pointeur en coordonnees dans le `viewBox` SVG `1000 x 700`.

### `addScreen()`

Ajoute une nouvelle fenetre vide, la rend active, remet la simulation sur la premiere fenetre et vide la selection.

### `renameScreen(screenId, name)`

Modifie le nom d'une fenetre dans la liste.

### `removeSelectedItems()`

Supprime les contenus selectionnes et retire aussi les interactions qui dependent de ces contenus. Cela evite les liens orphelins.

### `applyInteraction()`

Associe la selection courante a une interaction. Si cette meme selection avait deja un lien, l'ancien est remplace par le nouveau.

### `startSimulation()` et `stopSimulation()`

Activent et desactivent le mode simulation. Le lancement force l'affichage sur la premiere fenetre pour suivre l'exigence de depart du prototype.

## Gestion du pointeur sur le canevas

### `handleCanvasPointerDown(event)`

Demarre soit:

- un dessin si l'outil courant est le crayon;
- une selection rectangulaire si l'outil courant est la selection.

Le mode simulation desactive toute edition.

### `handleCanvasPointerMove(event)`

Met a jour l'action en cours selon le type stocke dans `pointerStateRef`:

- en dessin, ajoute un point au trait temporaire;
- en deplacement, translate les points et les bounds des contenus selectionnes;
- en selection, met a jour le rectangle marquee.

Quand des contenus sont deplaces, les bounds des interactions dependantes sont aussi recalcules.

### `handleCanvasPointerUp()`

Finalise l'interaction pointeur:

- un dessin devient un nouvel item si au moins deux points existent;
- les points trop rapproches sont filtres;
- une selection marquee calcule les contenus touches;
- le rectangle temporaire est nettoye.

## Selection et deplacement d'un contenu

### `handleItemPointerDown(event, itemId)`

Gere le clic direct sur un trait lorsque l'outil de selection est actif.

Comportements pris en charge:

- clic simple pour selectionner un seul contenu;
- `Maj` ou `Verr Maj` pour ajouter ou retirer un contenu de la selection;
- glisser pour deplacer toute la selection.

La fonction capture aussi une copie des contenus de depart dans `originalItems` afin de calculer les translations proprement pendant le drag.

## Simulation

### `handleSimulationClick(interaction)`

Quand l'utilisateur clique sur une zone interactive, la fenetre de destination devient la fenetre simulee courante.

### `renderScreenPreview(screen)`

Genere le petit apercu SVG de chaque fenetre dans la colonne de gauche.

## Rendu JSX

Le rendu est decoupe en trois zones visuelles.

### Panneau gauche

Contient:

- l'identite du projet;
- les outils d'edition;
- la liste des fenetres avec apercu et renommage.

### Zone centrale

Contient:

- le titre de la fenetre active;
- les statistiques de contenus et de liens;
- le canevas SVG principal.

Le canevas affiche:

- le fond;
- une grille visuelle;
- tous les traits dessines;
- les rectangles de selection;
- les contours des interactions;
- le trait temporaire en cours de dessin;
- la zone marquee de selection multiple.

### Panneau droit

Contient:

- un resume de la selection courante;
- les controles pour transformer une selection en bouton ou hyperlien;
- le mode simulation ou son ecran d'attente.

## Comment la navigation prototype est realisee

La navigation ne depend pas des traits eux-memes mais des rectangles englobants calcules a partir d'eux. En simulation:

- chaque interaction cree un `rect` cliquable;
- un survol met cette zone en evidence;
- un clic remplace `simulationScreenId` par la destination choisie.

Cela rend le prototype simple a utiliser meme si les elements dessines a la main ne sont pas geometriquement parfaits.

## Limites actuelles du fichier

- Les contenus sont des traits libres uniquement, pas des composants UI structures.
- Il n'existe pas de persistence locale ou d'export.
- Les interactions sont basees sur des rectangles englobants et non sur des formes vectorielles precises.
- La suppression de fenetres n'est pas implementee.

## Resume

`App.jsx` est le coeur fonctionnel de MaxCanva. Il combine edition graphique, organisation multi-fenetres, creation de navigation et lecture simulee du prototype dans un seul composant React.