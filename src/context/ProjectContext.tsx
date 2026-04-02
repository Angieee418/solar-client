import { createContext } from 'react'
import type { ProjectModel } from '../models/project'

/**
 * Defines the shared project state exposed to pages that need the current project.
 */
export interface ProjectContextType {
  projectId: string | null
  project: ProjectModel | null
  setProject: (p: ProjectModel | null) => void
}

/**
 * Stores the currently selected project so related pages can read and update it.
 */
export const ProjectContext = createContext<ProjectContextType>({
  projectId: null,
  project: null,
  setProject: () => {},
})

export default ProjectContext
