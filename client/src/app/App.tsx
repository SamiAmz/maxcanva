import { useCallback, useEffect, useState } from 'react';
import type { AuthSession } from '@maxcanva/shared';
import { AuthDialog } from '@/features/auth/components/AuthDialog';
import { DrawingCanvas } from '@/features/canvas/components/DrawingCanvas';
import { DrawingControls } from '@/features/canvas/components/DrawingControls';
import { EditorHeader } from '@/features/editor/components/EditorHeader';
import { ToolRail } from '@/features/editor/components/ToolRail';
import { useEditorStore } from '@/features/editor/store/useEditorStore';
import { SelectionControls } from '@/features/selection/components/SelectionControls';
import { SimulationView } from '@/features/simulation/components/SimulationView';
import { WindowsPanel } from '@/features/windows/components/WindowsPanel';
import '@/styles.css';
import { authGateway } from '@/infrastructure/auth/httpAuthGateway';

export default function App() {
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const activeTool = useEditorStore((state) => state.activeTool);
  const showDrawingControls = [
    'pencil',
    'rectangle',
    'circle',
    'text',
  ].includes(activeTool);

  useEffect(() => {
    void authGateway.getSession().then(setSession).catch(() => setSession(null));
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const signOut = useCallback(async () => {
    try {
      await authGateway.signOut();
    } finally {
      setSession(null);
    }
  }, []);

  return (
    <div className="editor-shell">
      <EditorHeader
        session={session}
        onOpenAuth={() => setAuthOpen(true)}
        onSignOut={() => void signOut()}
        onStartSimulation={() => setSimulationOpen(true)}
      />
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
      <AuthDialog
        open={authOpen}
        onClose={closeAuth}
        onAuthenticated={setSession}
      />
    </div>
  );
}
