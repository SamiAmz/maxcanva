# MaxCanva

MaxCanva est un éditeur de prototypes dessinés à main levée. Le client est construit avec React, TypeScript, Konva et Zustand.

## Lancer le projet

```bash
npm install
npm run dev
```

La commande `npm run build` vérifie TypeScript et produit la version de production.

## Organisation du client

```text
client/src/
├── components/             En-tête et barre d'outils globale
├── features/
│   ├── canvas/             Page Konva, outils de dessin et rendu des contenus
│   ├── interactions/       Boutons, hyperliens et dialogue de configuration
│   ├── selection/          Actions sur les contenus sélectionnés
│   ├── simulation/         Exécution et navigation dans le prototype
│   └── windows/            Liste et miniatures des fenêtres
├── store/                  État global Zustand et actions métier
├── types/                  Modèle de données partagé dans le client
├── App.tsx                 Assemblage de l'interface
└── styles.css              Styles globaux et responsive
```

## Modèle de données

- `PrototypeWindow` représente une page du prototype.
- `CanvasContent` représente un trait, une forme, un texte ou un widget.
- `ContentGroup` associe plusieurs contenus d'une même fenêtre.
- Un contenu de type `pencil` suit le format Konva `[x1, y1, x2, y2, ...]`.
- `PrototypeInteraction` associe un ou plusieurs contenus à une action.
- Un `button` possède une `targetWindowId` et navigue dans le prototype.
- Un `link` possède une `url` et ouvre une page web.

Les contenus ne sont pas stockés directement dans une fenêtre. Chaque contenu contient plutôt un `windowId`. Cette organisation permet de filtrer la fenêtre active tout en conservant un seul tableau central.

## Parcours d'une action

### Dessiner

1. La barre d'outils permet de choisir le crayon, le rectangle, le cercle ou le texte.
2. `DrawingCanvas` convertit les événements du pointeur en coordonnées logiques 960×640.
3. Un glissement dessine un trait ou une forme; un clic place l'éditeur de texte.
4. Le nouveau `CanvasContent` est ajouté à `useEditorStore`.
5. `CanvasContentShape` fournit le même rendu à l'éditeur, aux miniatures et à la simulation.

### Sélectionner et déplacer

1. L'outil `select` rend tous les contenus interactifs.
2. Un clic sélectionne un contenu; Maj/Ctrl/Cmd permet une sélection multiple.
3. Un rectangle de sélection choisit tous les contenus qu'il croise.
4. Le contenu sélectionné se déplace par glissement.
5. Les poignées du cadre permettent de redimensionner un ou plusieurs contenus.
6. Konva affiche le geste, puis le store enregistre les nouvelles coordonnées et dimensions au relâchement.

### Aligner les contenus

1. Pendant un déplacement, les bords et les centres proches s'alignent automatiquement.
2. Un repère violet temporaire indique l'alignement détecté avec un autre contenu ou avec la page.
3. Les repères disparaissent immédiatement au relâchement.
4. Maintenir `Alt` pendant le déplacement désactive temporairement l'aimantation.

### Grouper et dégrouper

1. Sélectionnez au moins deux contenus et utilisez l'action `Grouper`.
2. Un clic sur un membre du groupe sélectionne ensuite tous ses contenus.
3. Le déplacement, le redimensionnement, la suppression et les interactions s'appliquent à l'ensemble.
4. Les actions `Grouper` et `Dégrouper` s'activent seulement lorsqu'elles sont applicables.
5. Plusieurs groupes et contenus peuvent être sélectionnés puis fusionnés en un seul groupe.

### Ajouter et simuler des widgets

1. Choisissez l'outil `Case` ou `Champ`, puis cliquez dans la fenêtre.
2. Une case est créée seule; un petit éditeur permet d'ajouter un libellé facultatif ou de passer cette étape.
3. Un double-clic sur une case permet ensuite de modifier ou retirer son libellé.
4. Le widget est ajouté avec une taille adaptée et immédiatement sélectionné.
5. Il peut être déplacé, redimensionné, groupé ou supprimé comme les autres contenus.
6. En simulation, la case peut être cochée et le champ accepte une saisie réelle.

### Créer une interaction

1. `SelectionControls` ouvre `InteractionDialog` pour les contenus sélectionnés.
2. Un bouton reçoit une fenêtre cible; un hyperlien reçoit une URL.
3. Le store garantit qu'un contenu n'appartient qu'à une interaction.
4. `InteractionOverlay` affiche la zone et sa destination dans l'éditeur.

### Simuler

1. `SimulationView` démarre sur la première fenêtre.
2. Les contenus sont affichés sans outils d'édition.
3. Une zone transparente est calculée autour des contenus de chaque interaction.
4. Un bouton change la fenêtre courante; un hyperlien ouvre un nouvel onglet.

## Rôle du store Zustand

`useEditorStore.ts` est la source de vérité de l'application. Il contient les fenêtres, les contenus, les interactions, la sélection et le style des outils. Les composants lisent seulement les valeurs dont ils ont besoin et appellent les actions du store pour modifier les données.

Lorsqu'un contenu est supprimé, le store nettoie aussi les interactions qui le référencent. Cette règle évite les références invalides.

## Styles

`styles.css` contient les styles globaux. Les classes sont regroupées selon les grandes zones de l'interface : en-tête, outils, fenêtres, canvas, contrôles contextuels, dialogues, simulation et adaptation mobile.

## Ajouter une fonctionnalité

Une fonctionnalité autonome doit être ajoutée sous `client/src/features/<nom>/`. Placez son état global dans le store seulement s'il doit être partagé entre plusieurs composants ou conservé lors d'un changement de fenêtre. Les types persistants doivent être ajoutés dans `types/drawing.ts`.
