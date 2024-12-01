import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import { useRecoilValue, useSetRecoilState, useRecoilState } from 'recoil';
import { AuthAtom, AuthUser, isLoginSelector } from '../../recoil/AuthAtom';
import {selectedSportAtom} from '../../recoil/Sport';
import { useState } from 'react';

const Header = () => {
  const navigate = useNavigate();
  const setToken = useSetRecoilState(AuthAtom); 
  const setAuthUser = useSetRecoilState(AuthUser); 
  const [selectedSport, setSelectedSport] = useRecoilState(selectedSportAtom);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isLogin = useRecoilValue(isLoginSelector);

  const toLogOut = () => {
    setToken(undefined);
    setAuthUser(undefined);
    localStorage.removeItem('tokens');
    navigate('/');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  const selectSport = (sport) => {
    setSelectedSport(sport);

    const searchParams = new URLSearchParams(location.search);
    searchParams.set('sport', sport.toLowerCase()); 
    navigate(`${location.pathname}?${searchParams.toString()}`);
    setIsDropdownOpen(false); 
  };

  return (
    <header className='header'>
      <div className='header-image'>
        <img className='hover' src="https://placehold.co/50x50" alt="" onClick={() => {navigate('/'); window.location.reload();}} />
        <div className='dropdown'>
          <p className='dropdown-title hover' onClick={toggleDropdown}>Sports</p>
          {isDropdownOpen && (
            <ul className='dropdown-menu'>
              <li onClick={() => selectSport('Soccer')}>Soccer</li>
              <li onClick={() => selectSport('Basketball')}>Basketball</li>
              <li onClick={() => selectSport('Football')}>Football</li>
              <li onClick={() => selectSport('Baseball')}>Baseball</li>
            </ul>
          )}
        </div>
      </div>
      <nav className='header-links'>
        <Link className='links hover' to={`/leagues?sport=${selectedSport.toLowerCase()}`}>Leagues</Link>
        <Link className='links hover' to={'/about'}>Players</Link>
        <Link className='links hover' to={'/faq'}>FAQ</Link>
      </nav>
      <div className='header-user'>
        {isLogin ? (
          <button className='right-icon logIn hover' onClick={toLogOut}>Logout</button>
        ) : (
          <button className='right-icon logIn hover' onClick={() => navigate('/login')}>Login</button>
        )}
      </div>
    </header>
  );
};

export default Header;
