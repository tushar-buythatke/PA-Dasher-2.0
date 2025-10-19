import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'

import './index.css'
import App from './App'
import AnalyticsPage from './pages/Analytics'
import { ThemeProvider } from './components/theme/theme-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
