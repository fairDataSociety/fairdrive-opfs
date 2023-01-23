import React from 'react'
import './App.css'
import { FairdriveBrowser } from './fairdrive'
import { IpfsBrowser } from './ipfs'

const App = () => {
  return (
    <div className="App" style={{ display: 'flex' }}>
      <IpfsBrowser name="ipfs" id="ipfs" />
      <FairdriveBrowser name="fairos" id="fairos" />
    </div>
  )
}

export default App
