import React from 'react'
import './App.css'
import { FairdriveBrowser } from './fairdrive'

const App = () => {
  return (
    <div className="App" style={{ display: 'flex' }}>
      <FairdriveBrowser name={'DemoFS'} id="DemoFS" />
    </div>
  )
}

export default App
