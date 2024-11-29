import { Link, useNavigate } from 'react-router-dom';
import './Header.css';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { AuthAtom, AuthUser, isLoginSelector } from '../../recoil/AuthAtom';
import { useState } from 'react';

const Header = () => {
  const navigate = useNavigate();
  const setToken = useSetRecoilState(AuthAtom); 
  const setAuthUser = useSetRecoilState(AuthUser); 
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toLogOut = () => {
    setToken(undefined);
    setAuthUser(undefined);
    localStorage.removeItem('tokens');
    navigate('/');
  };

  const isLogin = useRecoilValue(isLoginSelector);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <header className='header'>
      <div className='header-image'>
        <img className='hover' src="https://placehold.co/50x50" alt="" onClick={() => navigate('/')} />
        <div className='dropdown'>
          <p className='dropdown-title hover' onClick={toggleDropdown}>Sports</p>
          {isDropdownOpen && (
            <ul className='dropdown-menu'>
              <li onClick={() => navigate('/sports/soccer')}>Soccer</li>
              <li onClick={() => navigate('/sports/basketball')}>Basketball</li>
              <li onClick={() => navigate('/sports/baseball')}>Baseball</li>
              <li onClick={() => navigate('/sports/tennis')}>Tennis</li>
            </ul>
          )}
        </div>
      </div>
      <nav className='header-links'>
        <Link className='links hover' to={'/league'}>Leagues</Link>
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
