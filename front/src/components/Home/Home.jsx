import React from 'react'
import './Home.css'
import {useNavigate } from 'react-router-dom'

const Home = () => {
  const navigate = useNavigate();
  
  return (
    <div>
        <div className='home-hero-container'>
          <div className='home-hero'>
            <h1>Title</h1>
            <div className='par-wrapper'>
              <p> Body Paragraph</p>
            </div>
          </div>
        </div>
        <div className='home-container'>
            <div className='champ-container'>
              <div className='champ-all'>
                <h1 id='all'>All</h1>
              </div>
            </div>
        </div>
    </div>
  )
}

export default Home
