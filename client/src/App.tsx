import { DrawingCanvas } from './features/canvas/components/DrawingCanvas';
import { PencilControls } from './features/canvas/components/PencilControls';
import { EditorHeader } from './components/EditorHeader';
import { ToolRail } from './components/ToolRail';
import { WindowsPanel } from './features/windows/components/WindowsPanel';
import { SelectionControls } from './features/selection/components/SelectionControls';
import { useEditorStore } from './store/useEditorStore';
import './styles.css';

export default function App() {
  const activeTool = useEditorStore((state) => state.activeTool);

  return (
    <div className="editor-shell">
      <EditorHeader />
      <ToolRail />
      <WindowsPanel />
      <DrawingCanvas />
      {activeTool === 'pencil' ? <PencilControls /> : <SelectionControls />}
    </div>
  );
}
