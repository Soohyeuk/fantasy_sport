import { useState, useEffect } from 'react'
import LogIn from './components/LogIn/LogIn'
import { Routes, Route, useLocation, useNavigate} from 'react-router-dom'
import SignIn from './components/SignIn/SignIn'
import Home from './components/Home/Home'
import Header from './components/Header/Header'

import {useRecoilState, useSetRecoilState} from "recoil"
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { AuthAtom, AuthUser } from './recoil/AuthAtom'

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useRecoilState(AuthAtom);
  const setAuthUser = useSetRecoilState(AuthUser); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isTokenExpired = (token) => {
    const { exp } = jwtDecode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    return exp < currentTime;
  };

  const getNewAccessToken = async () => {
    if (refreshing) return;
    setRefreshing(true);
  
    try {
      const res = await axios.post('http://127.0.0.1:5000/refresh/', {
        refresh: token?.refresh,
      });
      setToken(res.data); 
      setAuthUser(jwtDecode(res.data.access));  
      localStorage.setItem('tokens', JSON.stringify(res.data));  
      console.log('Token refreshed successfully');

    } catch (error) {
      console.log('Error refreshing token, logging out', error);
      setToken(undefined);  
      setAuthUser(undefined); 
      localStorage.removeItem('tokens');  
      navigate('/login'); 

    } finally {
      setRefreshing(false);
      if (loading) setLoading(false); 
    }
  };
  
  useEffect(() => {
    if (loading && token?.access) {
      if (isTokenExpired(token.access)) {
        getNewAccessToken();
      } else {
        setAuthUser(jwtDecode(token.access));
        setLoading(false);
      }
    }
  
    const interval = setInterval(() => {
      if (token?.access && isTokenExpired(token.access)) {
        getNewAccessToken();
      }
    }, 1000 * 4 * 60);
  
    return () => clearInterval(interval);
  }, [token, loading]);
  
  
  const location = useLocation();
  const shouldShowHeader = !['/login', '/signin'].includes(location.pathname);
  return (
    <>
      {shouldShowHeader && <Header />}
        <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path='/login' element={<LogIn/>}/>
            <Route path='/signin' element={<SignIn/>}/>
        </Routes>
    </>
  )
}

export default App
