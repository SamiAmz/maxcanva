import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthSession, StoredProject } from '@maxcanva/shared';
import { AuthDialog } from '@/features/auth/components/AuthDialog';
import { ProjectsDialog } from '@/features/projects/components/ProjectsDialog';
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
import { toProjectDocument } from '@/domain/project/projectDocument';
import { projectRepository } from '@/infrastructure/persistence/httpProjectRepository';
import { loadSessionDraft, saveSessionDraft } from '@/infrastructure/persistence/sessionDraft';

export default function App() {
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentProject, setCurrentProject] = useState<{ id: string; revision: number } | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [projectSaveState, setProjectSaveState] = useState<'unsaved' | 'saved' | 'error'>('unsaved');
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const draftTimerRef = useRef<number | null>(null);
  const activeTool = useEditorStore((state) => state.activeTool);
  const showDrawingControls = [
    'pencil',
    'line',
    'rectangle',
    'circle',
    'text',
  ].includes(activeTool);

  useEffect(() => {
    void authGateway.getSession().then(setSession).catch(() => setSession(null));
  }, []);

  useEffect(() => {
    const draft = loadSessionDraft();
    if (draft) useEditorStore.getState().loadProjectDocument(draft);

    const unsubscribe = useEditorStore.subscribe((state) => {
      setProjectSaveState('unsaved');
      if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
      draftTimerRef.current = window.setTimeout(() => {
        saveSessionDraft(toProjectDocument(state));
      }, 250);
    });
    return () => {
      unsubscribe();
      if (draftTimerRef.current !== null) window.clearTimeout(draftTimerRef.current);
    };
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const signOut = useCallback(async () => {
    try {
      await authGateway.signOut();
    } finally {
      setSession(null);
      setCurrentProject(null);
    }
  }, []);

  const saveProject = useCallback(async () => {
    if (!session) {
      setAuthOpen(true);
      throw new Error('Connexion requise');
    }
    setSavingProject(true);
    setProjectNotice(null);
    try {
      const state = useEditorStore.getState();
      const stored = await projectRepository.save({
        id: currentProject?.id ?? crypto.randomUUID(),
        document: toProjectDocument(state),
        expectedRevision: currentProject?.revision,
      });
      setCurrentProject({ id: stored.id, revision: stored.revision });
      setProjectSaveState('saved');
      setProjectNotice('Projet sauvegardé ✓');
      window.setTimeout(() => setProjectNotice(null), 2400);
      return stored;
    } catch (error) {
      setProjectSaveState('error');
      setProjectNotice(error instanceof Error ? error.message : 'Impossible de sauvegarder le projet.');
      window.setTimeout(() => setProjectNotice(null), 3200);
      throw error;
    } finally {
      setSavingProject(false);
    }
  }, [currentProject, session]);

  const openStoredProject = useCallback((project: StoredProject) => {
    useEditorStore.getState().loadProjectDocument(project.document);
    setCurrentProject({ id: project.id, revision: project.revision });
    setProjectSaveState('saved');
    setProjectNotice(`« ${project.title} » est ouvert`);
    window.setTimeout(() => setProjectNotice(null), 2400);
  }, []);

  const createNewProject = useCallback(() => {
    useEditorStore.getState().createBlankProject();
    setCurrentProject(null);
    setProjectSaveState('unsaved');
    setProjectNotice('Nouveau projet prêt');
    window.setTimeout(() => setProjectNotice(null), 2000);
  }, []);

  return (
    <div className="editor-shell">
      <EditorHeader
        session={session}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenProjects={() => session ? setProjectsOpen(true) : setAuthOpen(true)}
        onSaveProject={() => void saveProject().catch(() => undefined)}
        onSignOut={() => void signOut()}
        onStartSimulation={() => setSimulationOpen(true)}
        savingProject={savingProject}
        projectSaveState={projectSaveState}
        hasSavedProject={Boolean(currentProject)}
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
      <ProjectsDialog
        open={projectsOpen && Boolean(session)}
        currentProjectId={currentProject?.id ?? null}
        onClose={() => setProjectsOpen(false)}
        onCreateNew={createNewProject}
        onOpenProject={openStoredProject}
        onSaveCurrent={saveProject}
        onDeleteProject={(projectId) => {
          if (currentProject?.id === projectId) {
            setCurrentProject(null);
            setProjectSaveState('unsaved');
          }
        }}
      />
      {projectNotice && <div className="project-toast" role="status">{projectNotice}</div>}
    </div>
  );
}
