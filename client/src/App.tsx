import { useState } from 'react';
import { DrawingCanvas } from './features/canvas/components/DrawingCanvas';
import { DrawingControls } from './features/canvas/components/DrawingControls';
import { EditorHeader } from './components/EditorHeader';
import { ToolRail } from './components/ToolRail';
import { WindowsPanel } from './features/windows/components/WindowsPanel';
import { SelectionControls } from './features/selection/components/SelectionControls';
import { useEditorStore } from './store/useEditorStore';
import { SimulationView } from './features/simulation/components/SimulationView';
import './styles.css';

export default function App() {
  const [simulationOpen, setSimulationOpen] = useState(false);
  const activeTool = useEditorStore((state) => state.activeTool);
  const showDrawingControls = [
    'pencil',
    'rectangle',
    'circle',
    'text',
  ].includes(activeTool);

  return (
    <div className="editor-shell">
      <EditorHeader onStartSimulation={() => setSimulationOpen(true)} />
      <ToolRail />
      <WindowsPanel />
      <DrawingCanvas />
      {/* La barre contextuelle dépend de l'outil actif. */}
      {activeTool === 'select' ? (
        <SelectionControls />
      ) : showDrawingControls ? (
        <DrawingControls />
      ) : null}
      <SimulationView
        open={simulationOpen}
        onClose={() => setSimulationOpen(false)}
      />
    </div>
  );
}
