import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConsentApp } from './app/ConsentApp'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConsentApp />
  </React.StrictMode>
)
