# MaxCanva

MaxCanva est un éditeur de prototypes dessinés à main levée. Le dépôt est un
monorepo TypeScript composé d'un client React, d'un noyau partagé et d'un
serveur préparé pour les fonctionnalités distantes.

## Lancer le projet

```bash
npm install
npm run dev
```

La commande `npm run build` vérifie les trois workspaces puis produit la version
de production du client.

## Organisation du dépôt

```text
maxcanva/
├── client/
│   └── src/
│       ├── app/                 Composition de l'application
│       ├── application/ports/   Contrats des services externes
│       ├── domain/project/      Règles pures du prototype
│       ├── features/            Interface organisée par fonctionnalité
│       ├── infrastructure/      Futurs adaptateurs client
│       └── styles/              Styles de l'éditeur
├── server/
│   └── src/modules/
│       ├── auth/                Comptes et sessions
│       ├── projects/            Sauvegarde et autorisation
│       └── assistant/           Intégration LLM côté serveur
└── shared/
    └── src/contracts/           Données échangées entre client et serveur
```

Les alias `@/` et `@maxcanva/shared` évitent que les imports dépendent de la
profondeur des dossiers. La direction des dépendances et les points d'extension
sont détaillés dans [ARCHITECTURE.md](./ARCHITECTURE.md).

## Modèle de données

- `ProjectDocument` est le format versionné destiné à la sauvegarde et aux
  échanges avec le serveur.
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

### Annuler une action

1. Le bouton `↶` de l'en-tête annule la dernière modification.
2. Le raccourci `Ctrl + Z` ou `Cmd + Z` offre le même comportement.
3. Un tracé ou un geste de déplacement et de redimensionnement compte comme une seule action.
4. L'historique conserve jusqu'à 50 modifications de contenu, fenêtres, groupes et interactions.
5. Lorsqu'un champ de saisie est actif, le raccourci reste réservé à l'édition du texte.

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

`features/editor/store/useEditorStore.ts` est la source de vérité de la session
d'édition. Il contient à la fois les données du document et l'état temporaire
de l'interface. `domain/project/projectDocument.ts` extrait uniquement la partie
persistante; l'outil actif, la sélection et l'historique ne sont donc pas inclus
dans un fichier ou une sauvegarde.

Lorsqu'un contenu est supprimé, le store nettoie aussi les interactions qui le référencent. Cette règle évite les références invalides.

## Styles

`styles.css` est le point d'entrée des feuilles spécialisées de `styles/`.
Les classes sont regroupées selon les grandes zones de l'interface : en-tête,
outils, fenêtres, canvas, contrôles contextuels, dialogues, simulation et
adaptation mobile.

## Ajouter une fonctionnalité

Une fonctionnalité visuelle autonome doit être ajoutée sous
`client/src/features/<nom>/`. Une règle qui ne dépend pas de React va dans
`client/src/domain/`. Un service externe est d'abord décrit par un port dans
`client/src/application/ports/`, puis implémenté dans `client/src/infrastructure/`.
Tout contrat persistant ou échangé avec le serveur appartient à
`shared/src/contracts/`.
