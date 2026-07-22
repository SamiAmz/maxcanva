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
│   ├── canvas/             Page Konva et dessin au crayon
│   ├── interactions/       Boutons, hyperliens et dialogue de configuration
│   ├── selection/          Actions sur les traits sélectionnés
│   ├── simulation/         Exécution et navigation dans le prototype
│   └── windows/            Liste et miniatures des fenêtres
├── store/                  État global Zustand et actions métier
├── types/                  Modèle de données partagé dans le client
├── App.tsx                 Assemblage de l'interface
└── styles.css              Styles globaux et responsive
```

## Modèle de données

- `PrototypeWindow` représente une page du prototype.
- `Stroke` représente un trait. Ses points suivent le format Konva `[x1, y1, x2, y2, ...]`.
- `PrototypeInteraction` associe un ou plusieurs traits à une action.
- Un `button` possède une `targetWindowId` et navigue dans le prototype.
- Un `link` possède une `url` et ouvre une page web.

Les traits ne sont pas stockés directement dans une fenêtre. Chaque trait contient plutôt un `windowId`. Cette organisation permet de filtrer les traits de la fenêtre active tout en conservant un seul tableau central.

## Parcours d'une action

### Dessiner

1. `DrawingCanvas` reçoit l'événement du pointeur.
2. `usePencilDrawing` convertit la position affichée en coordonnées logiques 960×640.
3. Le hook crée ou met à jour un `Stroke` dans `useEditorStore`.
4. React Konva redessine le trait et les miniatures utilisent les mêmes données.

### Sélectionner et déplacer

1. L'outil `select` rend les traits interactifs.
2. Un clic sélectionne un trait; Maj/Ctrl/Cmd permet une sélection multiple.
3. Un rectangle sélectionne tous les traits qu'il croise.
4. Konva effectue le déplacement visuel, puis le store applique le déplacement aux coordonnées lors du relâchement.

### Créer une interaction

1. `SelectionControls` ouvre `InteractionDialog` pour les traits sélectionnés.
2. Un bouton reçoit une fenêtre cible; un hyperlien reçoit une URL.
3. Le store garantit qu'un trait n'appartient qu'à une interaction.
4. `InteractionOverlay` affiche la zone et sa destination dans l'éditeur.

### Simuler

1. `SimulationView` démarre sur la première fenêtre.
2. Les traits sont affichés sans outils d'édition.
3. Une zone transparente est calculée autour des traits de chaque interaction.
4. Un bouton change la fenêtre courante; un hyperlien ouvre un nouvel onglet.

## Rôle du store Zustand

`useEditorStore.ts` est la source de vérité de l'application. Il contient les fenêtres, les traits, les interactions, la sélection et les réglages du crayon. Les composants lisent seulement les valeurs dont ils ont besoin et appellent les actions du store pour modifier les données.

Lorsqu'un trait est supprimé, le store nettoie aussi les interactions qui le référencent. Cette règle évite les références invalides.

## Styles

`styles.css` contient les styles globaux. Les classes sont regroupées selon les grandes zones de l'interface : en-tête, outils, fenêtres, canvas, contrôles contextuels, dialogues, simulation et adaptation mobile.

## Ajouter une fonctionnalité

Une fonctionnalité autonome doit être ajoutée sous `client/src/features/<nom>/`. Placez son état global dans le store seulement s'il doit être partagé entre plusieurs composants ou conservé lors d'un changement de fenêtre. Les types persistants doivent être ajoutés dans `types/drawing.ts`.
