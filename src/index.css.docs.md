# Documentation de `index.css`

## Role du fichier

`index.css` contient les styles globaux de base de l'application. Il fixe les regles communes a tout le document avant que `App.css` applique les styles specifiques de l'interface.

## Detail des regles

### `* { box-sizing: border-box; }`

Force tous les elements a calculer leur taille en incluant bordures et padding. Cela rend les dimensions plus predictibles sur toute l'application.

### `:root`

Definit les bases globales:

- la pile de polices;
- la hauteur de ligne;
- la couleur principale du texte;
- la couleur de fond generale;
- l'optimisation du rendu du texte.

Ces valeurs servent de socle a l'ensemble de l'application React.

### `html, body, #root`

Assurent que la racine de l'application peut occuper toute la hauteur disponible. Cela permet a la grille principale de s'etendre correctement en plein ecran.

### `body`

Supprime la marge par defaut du navigateur afin d'eviter un contour blanc autour de l'application.

### `button, input, select`

Force les controles natifs a reutiliser la typographie globale plutot que leur style navigateur implicite.

## Resume

`index.css` est un fichier de normalisation legere. Il ne decrit pas l'interface metier de MaxCanva, mais il garantit une base visuelle stable pour tous les composants et controles.