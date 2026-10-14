import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import '@fontsource-variable/newsreader'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: { background: '#FFFDF8', color: '#1F1C17', borderRadius: 999, boxShadow: '0 6px 24px rgba(60,45,20,0.12)', fontFamily: 'Instrument Sans, system-ui, sans-serif', fontSize: 15 },
            success: { iconTheme: { primary: '#2F5D50', secondary: '#FFFDF8' } },
            error: { iconTheme: { primary: '#A3402E', secondary: '#FFFDF8' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
