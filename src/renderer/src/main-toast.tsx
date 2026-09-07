import React from 'react'
import ReactDOM from 'react-dom/client'
import { ToastApp } from './app/ToastApp'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastApp />
  </React.StrictMode>
)
