import {React, useEffect, useState } from 'react'
import './Home.css'
import {useNavigate} from 'react-router-dom'
import axios from 'axios';

const Home = () => {
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:5000/test");
        setResult(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);
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
        <div>
          {result ? <p>Simple: {result.simple}</p> : <p>Loading...</p>}
          hey
        </div>
    </div>
  )
}

export default Home
