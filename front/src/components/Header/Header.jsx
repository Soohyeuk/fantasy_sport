import {Link, useNavigate} from 'react-router-dom'
import './Header.css'

const Header = () => {
  const navigate = useNavigate();
  return (
    <header className='header'>
        <div className='header-image'>
            <img className='hover' src="https://placehold.co/50x50" alt="" onClick={() => {navigate('/')}}/>
            <p>Title</p>
        </div>
        <nav className='header-links'>
            <Link className='links hover' to={'/'}>Some link 1</Link>
            <Link className='links hover' to={'/about'}>Some link 2</Link>
            <Link className='links hover' to={'/faq'}>Some link 3</Link>
            <Link className='links hover' to={'/PAW'}>Some link 4</Link>
        </nav>
        <div className='header-user'>
            <button className='right-icon logIn hover' onClick={() => {navigate('/login');}}>Login</button>
            <img className='right-icon hover' src="src/img/icons/dark_theme_icon.svg" alt="" />
            <img className='right-icon hover' src="src/img/icons/setting_icon.svg" alt="" />
        </div>
    </header>
  )
}

export default Header
