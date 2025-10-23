import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function App() {
  return <div>hello</div>
}

createRoot(document.getElementById('root')!).render(<App />)
