import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'
import './echo.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'var(--white)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-md)',
          borderRadius: 'var(--radius-md)'
        }
      }} />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
