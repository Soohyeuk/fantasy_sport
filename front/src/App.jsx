import { useState } from 'react'
import LogIn from './components/LogIn/LogIn'
import { Routes, Route, useLocation} from 'react-router-dom'
import SignIn from './components/SignIn/SignIn'
import Home from './components/Home/Home'

function App() {

  return (
    <>
      <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/login' element={<LogIn/>}/>
          <Route path='/signin' element={<SignIn/>}/>
      </Routes>
    </>
  )
}

export default App
