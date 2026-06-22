// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* Banner de instalação PWA — fora do layout para não ser afetado por z-index */}
      <PWAInstallBanner />
    </BrowserRouter>
  </React.StrictMode>,
)
