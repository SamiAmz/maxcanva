import { useEffect, useId, useState } from 'react';
import type { ProjectSummary, StoredProject } from '@maxcanva/shared';
import {
  ProjectRequestError,
  projectRepository,
} from '@/infrastructure/persistence/httpProjectRepository';

interface ProjectsDialogProps {
  open: boolean;
  currentProjectId: string | null;
  onClose: () => void;
  onCreateNew: () => void;
  onOpenProject: (project: StoredProject) => void;
  onSaveCurrent: () => Promise<StoredProject>;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectsDialog({
  open,
  currentProjectId,
  onClose,
  onCreateNew,
  onOpenProject,
  onSaveCurrent,
  onDeleteProject,
}: ProjectsDialogProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await projectRepository.list());
    } catch (caught) {
      setError(caught instanceof ProjectRequestError ? caught.message : 'Impossible de charger les projets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  if (!open) return null;

  const openProject = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const project = await projectRepository.get(id);
      if (project) {
        onOpenProject(project);
        onClose();
      }
    } catch (caught) {
      setError(caught instanceof ProjectRequestError ? caught.message : 'Impossible d’ouvrir ce projet.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteProject = async (project: ProjectSummary) => {
    if (!window.confirm(`Supprimer « ${project.title} » ?`)) return;
    setBusyId(project.id);
    setError(null);
    try {
      await projectRepository.delete(project.id);
      setProjects((items) => items.filter((item) => item.id !== project.id));
      onDeleteProject(project.id);
    } catch (caught) {
      setError(caught instanceof ProjectRequestError ? caught.message : 'Impossible de supprimer ce projet.');
    } finally {
      setBusyId(null);
    }
  };

  const saveCurrent = async () => {
    setBusyId('save');
    setError(null);
    try {
      await onSaveCurrent();
      await refresh();
    } catch (caught) {
      setError(caught instanceof ProjectRequestError ? caught.message : 'Impossible de sauvegarder le projet.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="projects-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busyId) onClose();
    }}>
      <section className="projects-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button className="projects-close-button" type="button" aria-label="Fermer" onClick={onClose}>×</button>
        <div className="projects-heading">
          <span aria-hidden="true">▱</span>
          <div>
            <h2 id={titleId}>Mes projets</h2>
            <p>Ouvrez un prototype ou sauvegardez votre travail actuel.</p>
          </div>
        </div>

        <div className="projects-dialog-actions">
          <button type="button" className="new-project-button" onClick={() => { onCreateNew(); onClose(); }}>＋ Nouveau</button>
          <button type="button" className="dialog-save-project-button" disabled={busyId === 'save'} onClick={() => void saveCurrent()}>
            {busyId === 'save' ? 'Sauvegarde…' : 'Sauvegarder le projet actuel'}
          </button>
        </div>

        {error && <div className="projects-error" role="alert">{error}</div>}

        <div className="projects-list" aria-busy={loading}>
          {loading ? (
            <p className="projects-empty">Chargement des projets…</p>
          ) : projects.length === 0 ? (
            <p className="projects-empty">✦ Aucun projet sauvegardé pour le moment.</p>
          ) : projects.map((project) => (
            <article key={project.id} className={`project-list-card ${project.id === currentProjectId ? 'is-current' : ''}`}>
              <button type="button" className="project-open-button" disabled={busyId === project.id} onClick={() => void openProject(project.id)}>
                <strong>{project.title}</strong>
                <small>Modifié {new Date(project.updatedAt).toLocaleString('fr-CA')}</small>
                <span>Révision {project.revision}</span>
              </button>
              <button type="button" className="project-delete-button" aria-label={`Supprimer ${project.title}`} disabled={busyId === project.id} onClick={() => void deleteProject(project)}>×</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
