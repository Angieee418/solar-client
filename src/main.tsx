import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import 'antd/dist/reset.css'
import './styles/index.css'
import { ProjectContext } from './context/ProjectContext'
import type { ProjectModel } from './models/project'

function Root() {
  const [project, setProject] = useState<ProjectModel | null>(null)
  const computeProjectId = (p: ProjectModel | null): string | null => {
    if (!p) return null
    return p.id || p.projectId || p._id || null
  }
  return (
    <React.StrictMode>
      <ProjectContext.Provider value={{ projectId: computeProjectId(project), project, setProject }}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProjectContext.Provider>
    </React.StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
