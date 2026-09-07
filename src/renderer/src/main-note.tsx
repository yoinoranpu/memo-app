import React from 'react'
import ReactDOM from 'react-dom/client'
import { NoteApp } from './app/NoteApp'
import './styles/global.css'
import './styles/note.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NoteApp />
  </React.StrictMode>
)
