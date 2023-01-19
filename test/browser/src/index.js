import React, { } from 'react'
import { createRoot } from 'react-dom/client';
import App from './App.js'
import './index.css'
import { setChonkyDefaults } from 'chonky'
import { ChonkyIconFA } from 'chonky-icon-fontawesome'

// Somewhere in your `index.ts`:
setChonkyDefaults({ iconComponent: ChonkyIconFA })
const root = createRoot(document.getElementById('root'))
root.render(<App />)