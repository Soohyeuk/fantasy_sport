import { useState, useEffect } from 'react'
import LogIn from './components/LogIn/LogIn'
import { Routes, Route, useLocation, useNavigate} from 'react-router-dom'
import SignIn from './components/SignIn/SignIn'
import Home from './components/Home/Home'
import Header from './components/Header/Header'
import {useRecoilState, useSetRecoilState, useRecoilValue} from "recoil"
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { AuthAtom, AuthUser } from './recoil/AuthAtom'
import { selectedSportAtom } from './recoil/Sport'
import Leagues from './components/Leagues/Leagues'
import CreateLeauge from './components/Leagues/CreateLeauge'
import Teams from './components/Teams/Teams'
import CreateTeam from './components/Teams/CreateTeam'
import Matches from './components/Matches/Matches'
import ProfileSetting from './components/ProfileSetting/ProfileSetting'

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useRecoilState(AuthAtom);
  const setAuthUser = useSetRecoilState(AuthUser); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  //login related
  const isTokenExpired = (token) => {
    const buffer = 30;
    const { exp } = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    return exp < currentTime + buffer;
  };

  const getNewAccessToken = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await axios.post(
        'http://127.0.0.1:5000/refresh/',
        { refresh: token?.refresh }
      );
      setToken(res.data); 
      setAuthUser(jwtDecode(res.data.access));  
      localStorage.setItem('tokens', JSON.stringify(res.data));  
      console.log('Token refreshed successfully');

    } catch (error) {
      console.log('Error refreshing token, logging out', error);
      setToken(undefined);  
      setAuthUser(undefined); 
      localStorage.removeItem('tokens');  
      navigate('/login', { replace: true }); 

    } finally {
      setRefreshing(false);
      if (loading) setLoading(false); 
    }
  };
  //log in related ends 


  const updateCSSVariables = (sport) => {
    const root = document.documentElement;
    switch (sport) {
      case 'Soccer':
      root.style.setProperty('--main-color', '#B8860B');
      break;
    case 'Basketball':
      root.style.setProperty('--main-color', '#ff5733'); 
      root.style.setProperty('--first-gray', '#d1d1d1');
      break;
    case 'Baseball':
      root.style.setProperty('--main-color', '#6A4C9C'); 
      break;
    case 'Football':
      root.style.setProperty('--main-color', '#3e8e41'); 
      break;
    default:
      break;
    }
  };

  const selectedSport = useRecoilValue(selectedSportAtom);  
  
  useEffect(() => {
    updateCSSVariables(selectedSport);  
  }, [selectedSport]); 

  useEffect(() => {
    if (loading) {
      getNewAccessToken();  
    }
  
    const interval = setInterval(() => {
      if (token) {
        getNewAccessToken();
      }
    }, 1000 * 2 * 60)
  
    return () => clearInterval(interval);
  }, [token, loading]);
   
  const location = useLocation();
  const [sport, setSport] = useRecoilState(selectedSportAtom);

  useEffect(() => {
    const extractSportFromURL = () => {
      const urlParams = new URLSearchParams(location.search);
      const sportFromURL = urlParams.get('sport');
      if (sportFromURL) {
        setSport(sportFromURL.charAt(0).toUpperCase() + sportFromURL.slice(1).toLowerCase());
      }
    };
    extractSportFromURL();

  }, [location.search, setSport]);


  const shouldShowHeader = !['/login', '/signin', '/leagues/create-league', '/teams/create-team'].includes(location.pathname);
  return (
    <>
      {shouldShowHeader && <Header />}
        <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path='/login' element={<LogIn/>}/>
            <Route path='/signin' element={<SignIn/>}/>

            <Route path="/leagues" exact element={<Leagues/>} />
            <Route path="/leagues/create-league" exact element={<CreateLeauge/>} />
            <Route path="/matches" element={<Matches />} />


            <Route path="/teams" exact element={<Teams/>} />
            <Route path="/teams/create-team" exact element={<CreateTeam/>} />

            <Route path="/profile-setting" exact element={<ProfileSetting/>} />
        </Routes>
    </>
  )
}

export default App
