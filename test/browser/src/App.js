import React from 'react'
import './App.css'
import { DemoFSBrowser } from './demofs'

const App = () => {
  return (
    <div className="App" style={{ display: 'flex' }}>
      <DemoFSBrowser name={'DemoFS'} id="DemoFS" />
    </div>
  )
}

export default App
