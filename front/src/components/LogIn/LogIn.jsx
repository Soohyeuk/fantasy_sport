import React, { useState, FormEvent } from 'react';
import './LogIn.css';
import { Link, useLocation, useNavigate} from 'react-router-dom';

const LogIn = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  return (
    <div>
      <div className="login-container">
        <div className="login-container-window">
          <h1 className='header1'>Log In</h1>
          <div className="login-form">
            <form>
              <input
                type="text"
                name="username"
                required
                placeholder="username"
                value={formData.username}
              />
              <input
                type="password"
                name="password"
                required
                placeholder="password"
                value={formData.password}
              />
              <input type="submit" value="Log In"/>
            </form>
          </div>
          <div className='errors'>
            {/* {responseError?<p>Invalid username or password. Try Again</p>:requestError? <p>Error in the server, please try in a few minutes.</p> :<p></p>} */}
          </div>
          <div className="links">
            <Link to="/signin" className="signin-link">
              Create a new account
            </Link>
            <Link to="/recover_account" className="signin-link">
              Forgot a password?
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LogIn;
