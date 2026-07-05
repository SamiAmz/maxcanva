import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const createScreen = (index) => ({
  id: `screen-${crypto.randomUUID()}`,
  name: `Fenetre ${index + 1}`,
  items: [],
  interactions: [],
})

const distance = (pointA, pointB) => {
  const dx = pointA.x - pointB.x
  const dy = pointA.y - pointB.y
  return Math.sqrt(dx * dx + dy * dy)
}

const getBoundsFromPoints = (points) => {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

const translateBounds = (bounds, deltaX, deltaY) => ({
  minX: bounds.minX + deltaX,
  maxX: bounds.maxX + deltaX,
  minY: bounds.minY + deltaY,
  maxY: bounds.maxY + deltaY,
})

const mergeBounds = (boundsList) => {
  if (boundsList.length === 0) {
    return null
  }

  return boundsList.reduce((accumulator, bounds) => ({
    minX: Math.min(accumulator.minX, bounds.minX),
    maxX: Math.max(accumulator.maxX, bounds.maxX),
    minY: Math.min(accumulator.minY, bounds.minY),
    maxY: Math.max(accumulator.maxY, bounds.maxY),
  }))
}

const boundsIntersect = (a, b) =>
  !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY)

const normalizeBounds = (start, end) => ({
  minX: Math.min(start.x, end.x),
  maxX: Math.max(start.x, end.x),
  minY: Math.min(start.y, end.y),
  maxY: Math.max(start.y, end.y),
})

const pointToString = (points) => points.map((point) => `${point.x},${point.y}`).join(' ')

const isAdditiveSelectionEvent = (event) =>
  event.shiftKey || event.getModifierState?.('CapsLock')

const createInteraction = ({ itemIds, kind, targetScreenId, items }) => {
  const relatedItems = items.filter((item) => itemIds.includes(item.id))
  const bounds = mergeBounds(relatedItems.map((item) => item.bounds))

  if (!bounds) {
    return null
  }

  return {
    id: `interaction-${crypto.randomUUID()}`,
    itemIds,
    kind,
    targetScreenId,
    bounds,
  }
}

const initialScreens = [createScreen(0)]

function App() {
  const [screens, setScreens] = useState(initialScreens)
  const [activeScreenId, setActiveScreenId] = useState(initialScreens[0].id)
  const [tool, setTool] = useState('pen')
  const [selectedItemIds, setSelectedItemIds] = useState([])
  const [draftStroke, setDraftStroke] = useState([])
  const [selectionRect, setSelectionRect] = useState(null)
  const [editorLinkType, setEditorLinkType] = useState('button')
  const [editorLinkTarget, setEditorLinkTarget] = useState(initialScreens[0].id)
  const [simulationScreenId, setSimulationScreenId] = useState(initialScreens[0].id)
  const [isSimulationMode, setIsSimulationMode] = useState(false)
  const [hoveredInteractionId, setHoveredInteractionId] = useState(null)
  const svgRef = useRef(null)
  const pointerStateRef = useRef(null)

  const activeScreen = useMemo(
    () => screens.find((screen) => screen.id === activeScreenId) ?? screens[0],
    [activeScreenId, screens],
  )

  const simulationScreen = useMemo(
    () => screens.find((screen) => screen.id === simulationScreenId) ?? screens[0],
    [screens, simulationScreenId],
  )

  const selectedInteraction = useMemo(() => {
    if (!activeScreen || selectedItemIds.length === 0) {
      return null
    }

    const sortedSelection = [...selectedItemIds].sort().join('|')
    return (
      activeScreen.interactions.find(
        (interaction) => [...interaction.itemIds].sort().join('|') === sortedSelection,
      ) ?? null
    )
  }, [activeScreen, selectedItemIds])

  useEffect(() => {
    if (!screens.some((screen) => screen.id === activeScreenId)) {
      setActiveScreenId(screens[0]?.id ?? null)
    }

    if (!screens.some((screen) => screen.id === simulationScreenId)) {
      setSimulationScreenId(screens[0]?.id ?? null)
    }
  }, [activeScreenId, screens, simulationScreenId])

  useEffect(() => {
    if (selectedInteraction) {
      setEditorLinkType(selectedInteraction.kind)
      setEditorLinkTarget(selectedInteraction.targetScreenId)
      return
    }

    if (screens.length > 1) {
      const fallbackTarget = screens.find((screen) => screen.id !== activeScreenId)
      if (fallbackTarget) {
        setEditorLinkTarget(fallbackTarget.id)
      }
    } else {
      setEditorLinkTarget(activeScreenId)
    }
  }, [activeScreenId, screens, selectedInteraction])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }

      if (isSimulationMode || selectedItemIds.length === 0) {
        return
      }

      event.preventDefault()
      removeSelectedItems()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSimulationMode, selectedItemIds])

  const updateActiveScreen = (updater) => {
    setScreens((currentScreens) =>
      currentScreens.map((screen) =>
        screen.id === activeScreenId ? updater(screen) : screen,
      ),
    )
  }

  const getCanvasPoint = (event) => {
    const svg = svgRef.current
    if (!svg) {
      return { x: 0, y: 0 }
    }

    const rect = svg.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 700,
    }
  }

  const addScreen = () => {
    const nextScreen = createScreen(screens.length)
    setScreens((currentScreens) => [...currentScreens, nextScreen])
    setActiveScreenId(nextScreen.id)
    setSimulationScreenId(initialScreens[0].id)
    setSelectedItemIds([])
  }

  const renameScreen = (screenId, name) => {
    setScreens((currentScreens) =>
      currentScreens.map((screen) =>
        screen.id === screenId ? { ...screen, name } : screen,
      ),
    )
  }

  const removeSelectedItems = () => {
    const selectionSet = new Set(selectedItemIds)

    updateActiveScreen((screen) => ({
      ...screen,
      items: screen.items.filter((item) => !selectionSet.has(item.id)),
      interactions: screen.interactions.filter(
        (interaction) => !interaction.itemIds.some((itemId) => selectionSet.has(itemId)),
      ),
    }))

    setSelectedItemIds([])
  }

  const applyInteraction = () => {
    if (!activeScreen || selectedItemIds.length === 0) {
      return
    }

    updateActiveScreen((screen) => {
      const nextInteraction = createInteraction({
        itemIds: selectedItemIds,
        kind: editorLinkType,
        targetScreenId: editorLinkTarget,
        items: screen.items,
      })

      if (!nextInteraction) {
        return screen
      }

      const sortedSelection = [...selectedItemIds].sort().join('|')
      const remainingInteractions = screen.interactions.filter(
        (interaction) => [...interaction.itemIds].sort().join('|') !== sortedSelection,
      )

      return {
        ...screen,
        interactions: [...remainingInteractions, nextInteraction],
      }
    })
  }

  const startSimulation = () => {
    setSimulationScreenId(screens[0].id)
    setHoveredInteractionId(null)
    setIsSimulationMode(true)
  }

  const stopSimulation = () => {
    setHoveredInteractionId(null)
    setIsSimulationMode(false)
  }

  const handleCanvasPointerDown = (event) => {
    if (!activeScreen || isSimulationMode) {
      return
    }

    const point = getCanvasPoint(event)

    if (tool === 'pen') {
      pointerStateRef.current = { type: 'draw' }
      setDraftStroke([point])
      return
    }

    const additiveSelection = isAdditiveSelectionEvent(event)

    pointerStateRef.current = {
      type: 'marquee',
      startPoint: point,
      additive: additiveSelection,
    }
    setSelectionRect({ ...normalizeBounds(point, point), additive: additiveSelection })
    if (!additiveSelection) {
      setSelectedItemIds([])
    }
  }

  const handleCanvasPointerMove = (event) => {
    const pointerState = pointerStateRef.current
    if (!pointerState || !activeScreen || isSimulationMode) {
      return
    }

    const point = getCanvasPoint(event)

    if (pointerState.type === 'draw') {
      setDraftStroke((currentStroke) => [...currentStroke, point])
      return
    }

    if (pointerState.type === 'move') {
      const deltaX = point.x - pointerState.startPoint.x
      const deltaY = point.y - pointerState.startPoint.y

      updateActiveScreen((screen) => ({
        ...screen,
        items: screen.items.map((item) => {
          const originalItem = pointerState.originalItems[item.id]
          if (!originalItem) {
            return item
          }

          const translatedPoints = originalItem.points.map((originalPoint) => ({
            x: originalPoint.x + deltaX,
            y: originalPoint.y + deltaY,
          }))

          return {
            ...item,
            points: translatedPoints,
            bounds: translateBounds(originalItem.bounds, deltaX, deltaY),
          }
        }),
        interactions: screen.interactions.map((interaction) => {
          if (!interaction.itemIds.some((itemId) => pointerState.originalItems[itemId])) {
            return interaction
          }

          const relatedBounds = screen.items
            .map((item) => {
              const originalItem = pointerState.originalItems[item.id]
              if (!originalItem) {
                return item.bounds
              }

              return translateBounds(originalItem.bounds, deltaX, deltaY)
            })
            .filter((_, index) => interaction.itemIds.includes(screen.items[index].id))

          return {
            ...interaction,
            bounds: mergeBounds(relatedBounds),
          }
        }),
      }))
      return
    }

    if (pointerState.type === 'marquee') {
      setSelectionRect({
        ...normalizeBounds(pointerState.startPoint, point),
        additive: pointerState.additive,
      })
    }
  }

  const handleCanvasPointerUp = () => {
    const pointerState = pointerStateRef.current
    pointerStateRef.current = null

    if (!pointerState || !activeScreen || isSimulationMode) {
      return
    }

    if (pointerState.type === 'draw') {
      if (draftStroke.length < 2) {
        setDraftStroke([])
        return
      }

      const filteredPoints = draftStroke.filter((point, index, array) => {
        if (index === 0) {
          return true
        }

        return distance(point, array[index - 1]) > 1.5
      })

      const nextItem = {
        id: `item-${crypto.randomUUID()}`,
        type: 'stroke',
        points: filteredPoints,
        bounds: getBoundsFromPoints(filteredPoints),
      }

      updateActiveScreen((screen) => ({
        ...screen,
        items: [...screen.items, nextItem],
      }))
      setDraftStroke([])
      return
    }

    if (pointerState.type === 'marquee' && selectionRect) {
      const matchedItems = activeScreen.items
        .filter((item) => boundsIntersect(item.bounds, selectionRect))
        .map((item) => item.id)

      setSelectedItemIds((currentSelection) =>
        pointerState.additive
          ? [...new Set([...currentSelection, ...matchedItems])]
          : matchedItems,
      )
    }

    setSelectionRect(null)
  }

  const handleItemPointerDown = (event, itemId) => {
    if (tool !== 'select' || isSimulationMode || !activeScreen) {
      return
    }

    event.stopPropagation()
    const point = getCanvasPoint(event)
    const additive = isAdditiveSelectionEvent(event)

    setSelectedItemIds((currentSelection) => {
      if (additive) {
        return currentSelection.includes(itemId)
          ? currentSelection.filter((currentItemId) => currentItemId !== itemId)
          : [...currentSelection, itemId]
      }

      return currentSelection.includes(itemId) ? currentSelection : [itemId]
    })

    const selectionSource =
      additive || !selectedItemIds.includes(itemId) ? [itemId] : selectedItemIds

    pointerStateRef.current = {
      type: 'move',
      startPoint: point,
      originalItems: Object.fromEntries(
        activeScreen.items
          .filter((item) => selectionSource.includes(item.id))
          .map((item) => [item.id, item]),
      ),
    }
  }

  const handleSimulationClick = (interaction) => {
    setSimulationScreenId(interaction.targetScreenId)
    setHoveredInteractionId(null)
  }

  const renderScreenPreview = (screen) => (
    <svg viewBox="0 0 1000 700" className="screen-miniature" aria-hidden="true">
      <rect width="1000" height="700" rx="32" className="screen-miniature__bg" />
      {screen.items.map((item) => (
        <polyline
          key={item.id}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointToString(item.points)}
        />
      ))}
    </svg>
  )

  return (
    <div className="app-shell">
      <aside className="panel panel--left">
        <div className="panel__section">
          <p className="eyebrow">Prototypeur</p>
          <h1>MaxCanva</h1>
          <p className="panel__text">
            Dessinez vos ecrans, reliez des zones interactives, puis lancez une
            simulation navigable.
          </p>
        </div>

        <div className="panel__section">
          <div className="panel__heading-row">
            <h2>Outils</h2>
            <button type="button" className="ghost-button" onClick={startSimulation}>
              Simuler
            </button>
          </div>
          <div className="tool-grid">
            <button
              type="button"
              className={tool === 'pen' ? 'tool-button is-active' : 'tool-button'}
              onClick={() => setTool('pen')}
            >
              Crayon
            </button>
            <button
              type="button"
              className={tool === 'select' ? 'tool-button is-active' : 'tool-button'}
              onClick={() => setTool('select')}
            >
              Selection
            </button>
            <button
              type="button"
              className="tool-button tool-button--danger"
              onClick={removeSelectedItems}
              disabled={selectedItemIds.length === 0}
            >
              Effacer
            </button>
          </div>
          <p className="panel__hint">
            En mode selection: cliquez pour choisir un trait, maintenez Maj ou Verr
            Maj pour en ajouter, ou glissez sur le canevas pour une selection multiple.
          </p>
        </div>

        <div className="panel__section">
          <div className="panel__heading-row">
            <h2>Fenetres</h2>
            <button type="button" className="ghost-button" onClick={addScreen}>
              Ajouter
            </button>
          </div>
          <div className="screen-list">
            {screens.map((screen, index) => (
              <div
                key={screen.id}
                className={
                  screen.id === activeScreenId
                    ? 'screen-card is-active'
                    : 'screen-card'
                }
              >
                <span className="screen-card__index">{index + 1}</span>
                <span className="screen-card__preview">{renderScreenPreview(screen)}</span>
                <input
                  value={screen.name}
                  onChange={(event) => renameScreen(screen.id, event.target.value)}
                  className="screen-card__name"
                  aria-label={`Nom de ${screen.name}`}
                />
                <button
                  type="button"
                  className="screen-card__open"
                  onClick={() => {
                    setActiveScreenId(screen.id)
                    setSelectedItemIds([])
                  }}
                >
                  Ouvrir
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="workspace">
        <div className="workspace__toolbar">
          <div>
            <p className="workspace__label">Fenetre active</p>
            <h2>{activeScreen?.name}</h2>
          </div>
          <div className="workspace__stats">
            <span>{activeScreen?.items.length ?? 0} contenus</span>
            <span>{activeScreen?.interactions.length ?? 0} liens</span>
          </div>
        </div>

        <div className="canvas-frame">
          <svg
            ref={svgRef}
            viewBox="0 0 1000 700"
            className={tool === 'pen' ? 'drawing-surface is-pen' : 'drawing-surface'}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
          >
            <rect width="1000" height="700" rx="36" className="drawing-surface__bg" />
            <g className="drawing-surface__grid">
              {Array.from({ length: 9 }, (_, index) => (
                <line
                  key={`v-${index}`}
                  x1={100 + index * 100}
                  y1="0"
                  x2={100 + index * 100}
                  y2="700"
                />
              ))}
              {Array.from({ length: 6 }, (_, index) => (
                <line
                  key={`h-${index}`}
                  x1="0"
                  y1={100 + index * 100}
                  x2="1000"
                  y2={100 + index * 100}
                />
              ))}
            </g>

            {activeScreen?.items.map((item) => {
              const isSelected = selectedItemIds.includes(item.id)
              return (
                <g key={item.id}>
                  {isSelected && (
                    <rect
                      x={item.bounds.minX - 14}
                      y={item.bounds.minY - 14}
                      width={item.bounds.maxX - item.bounds.minX + 28}
                      height={item.bounds.maxY - item.bounds.minY + 28}
                      rx="18"
                      className="selection-outline"
                    />
                  )}
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointToString(item.points)}
                    className={isSelected ? 'canvas-stroke is-selected' : 'canvas-stroke'}
                    onPointerDown={(event) => handleItemPointerDown(event, item.id)}
                  />
                </g>
              )
            })}

            {draftStroke.length > 1 && (
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointToString(draftStroke)}
                className="canvas-stroke canvas-stroke--draft"
              />
            )}

            {activeScreen?.interactions.map((interaction) => (
              <g key={interaction.id} className="interaction-tag">
                <rect
                  x={interaction.bounds.minX - 22}
                  y={interaction.bounds.minY - 22}
                  width={interaction.bounds.maxX - interaction.bounds.minX + 44}
                  height={interaction.bounds.maxY - interaction.bounds.minY + 44}
                  rx="24"
                  className={
                    selectedInteraction?.id === interaction.id
                      ? 'interaction-outline is-active'
                      : 'interaction-outline'
                  }
                />
                <text x={interaction.bounds.minX} y={interaction.bounds.minY - 30}>
                  {interaction.kind === 'button' ? 'Bouton' : 'Hyperlien'}
                </text>
              </g>
            ))}

            {selectionRect && (
              <rect
                x={selectionRect.minX}
                y={selectionRect.minY}
                width={selectionRect.maxX - selectionRect.minX}
                height={selectionRect.maxY - selectionRect.minY}
                className="marquee-selection"
              />
            )}
          </svg>
        </div>
      </main>

      <aside className="panel panel--right">
        <div className="panel__section">
          <h2>Zone selectionnee</h2>
          <p className="panel__text">
            {selectedItemIds.length === 0
              ? 'Aucun contenu selectionne.'
              : `${selectedItemIds.length} contenu(x) selectionne(s).`}
          </p>
        </div>

        <div className="panel__section">
          <h2>Interaction</h2>
          <label className="field">
            <span>Type</span>
            <select
              value={editorLinkType}
              onChange={(event) => setEditorLinkType(event.target.value)}
              disabled={selectedItemIds.length === 0}
            >
              <option value="button">Bouton</option>
              <option value="link">Hyperlien</option>
            </select>
          </label>
          <label className="field">
            <span>Destination</span>
            <select
              value={editorLinkTarget}
              onChange={(event) => setEditorLinkTarget(event.target.value)}
              disabled={selectedItemIds.length === 0}
            >
              {screens.map((screen) => (
                <option key={screen.id} value={screen.id}>
                  {screen.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary-button"
            onClick={applyInteraction}
            disabled={selectedItemIds.length === 0}
          >
            {selectedInteraction ? 'Mettre a jour le lien' : 'Creer le lien'}
          </button>
          <p className="panel__hint">
            La zone interactive englobe tous les contenus selectionnes et sera cliquable
            pendant la simulation.
          </p>
        </div>

        <div className="panel__section panel__section--simulation">
          <div className="panel__heading-row">
            <h2>Simulation</h2>
            {isSimulationMode && (
              <button type="button" className="ghost-button" onClick={stopSimulation}>
                Fermer
              </button>
            )}
          </div>

          {isSimulationMode ? (
            <div className="simulation-shell">
              <div className="simulation-shell__header">
                <span>Lecture utilisateur</span>
                <strong>{simulationScreen?.name}</strong>
              </div>
              <svg viewBox="0 0 1000 700" className="simulation-surface">
                <rect width="1000" height="700" rx="36" className="drawing-surface__bg" />
                {simulationScreen?.items.map((item) => (
                  <polyline
                    key={item.id}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pointToString(item.points)}
                    className="canvas-stroke"
                  />
                ))}
                {simulationScreen?.interactions.map((interaction) => {
                  const isHovered = hoveredInteractionId === interaction.id
                  return (
                    <g key={interaction.id}>
                      <rect
                        x={interaction.bounds.minX - 20}
                        y={interaction.bounds.minY - 20}
                        width={interaction.bounds.maxX - interaction.bounds.minX + 40}
                        height={interaction.bounds.maxY - interaction.bounds.minY + 40}
                        rx="24"
                        className={
                          isHovered ? 'simulation-hitbox is-hovered' : 'simulation-hitbox'
                        }
                        onMouseEnter={() => setHoveredInteractionId(interaction.id)}
                        onMouseLeave={() => setHoveredInteractionId(null)}
                        onClick={() => handleSimulationClick(interaction)}
                      />
                      <text
                        x={interaction.bounds.minX}
                        y={interaction.bounds.maxY + 48}
                        className={isHovered ? 'simulation-label is-hovered' : 'simulation-label'}
                      >
                        {interaction.kind === 'button' ? 'Bouton' : 'Hyperlien'}
                      </text>
                    </g>
                  )
                })}
              </svg>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSimulationScreenId(screens[0].id)}
              >
                Revenir a la premiere fenetre
              </button>
            </div>
          ) : (
            <div className="simulation-empty-state">
              <p>Lancez la simulation pour cliquer sur vos boutons et hyperliens.</p>
              <button type="button" className="primary-button" onClick={startSimulation}>
                Demarrer
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default App
