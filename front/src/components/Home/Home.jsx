import { React, useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import './Home.css';
import axios from 'axios';
import { useRecoilValue} from 'recoil';
import { selectedSportAtom } from '../../recoil/Sport';

const Home = () => {
  const [result, setResult] = useState(null);
  const sport = useRecoilValue(selectedSportAtom);


  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const { access: token } = JSON.parse(localStorage.getItem('tokens')) || {};
  //       if (token) {
  //         const response = await axios.get('http://127.0.0.1:5000/', {
  //           headers: {
  //             Authorization: `${token}`,
  //           },
  //         });
  //         setResult(response.data);
  //       }
  //     } catch (error) {
  //       console.error('Error fetching data:', error);
  //     }
  //   };

  //   fetchData();
  // }, []);

  return (
    <div>
      <div className="home-hero-container">
        <div className="home-hero">
          <h1>Welcome to the {sport} Fantasy League!</h1>
          <div className="par-wrapper">
            <p>Join and play fantasy sports with different people!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
