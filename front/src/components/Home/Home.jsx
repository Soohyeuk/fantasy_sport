import {React, useState, useEffect} from 'react'
import './Home.css'
import axios from 'axios';

const Home = () => {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const tokens = JSON.parse(localStorage.getItem("tokens"));
        const token = tokens?.access;
        const response = await axios.get("http://127.0.0.1:5000/", {
          headers: {
            Authorization: `${token}`, 
          },
        });
  
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
            <h1>Fantasy Sport Management System</h1>
            <div className='par-wrapper'>
              <p>Join and play fantasy sports with different people!</p>
            </div>
          </div>
        </div>
        <div>
          {result ? <p>Simple: {result.simple}</p> : <p>Loading...</p>}
        </div>
    </div>
  )
}

export default Home
