import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import '@fontsource/press-start-2p/400.css'
import '@fontsource/vt323/400.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'
import './pixel.css'
import { BootLoader, RouteFX } from './components/pixel.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BootLoader><App /><RouteFX /></BootLoader>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { background: '#FFF1E8', color: '#000000', borderRadius: 0, border: '3px solid #000000', boxShadow: '4px 4px 0 #000000', fontFamily: "'VT323', monospace", fontSize: 21 },
            success: { iconTheme: { primary: '#008751', secondary: '#FFFFFF' } },
            error: { iconTheme: { primary: '#FF004D', secondary: '#FFFFFF' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
