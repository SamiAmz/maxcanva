import type { ProjectDocument } from '@maxcanva/shared';

export interface ProjectFileGateway {
  export(document: ProjectDocument): Promise<void>;
  import(): Promise<ProjectDocument | null>;
}
