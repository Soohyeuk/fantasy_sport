import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './LogIn.css';
import axios from "axios";
import { AuthAtom, AuthUser } from '../../recoil/AuthAtom';
import { useSetRecoilState } from "recoil";
import {jwtDecode} from 'jwt-decode'; // Fix the import here

const LogIn = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const setToken = useSetRecoilState(AuthAtom);
  const setAuthUser = useSetRecoilState(AuthUser);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location?.state?.redirectedFrom?.pathname || "/";
  const [requestError, setRequestError] = useState(false);
  const [responseError, setResponseError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://127.0.0.1:5000/login/', {
        username: formData.username,
        password: formData.password,
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const { access, refresh } = response.data; // Destructure tokens from response
      console.log("a");

      // Decode access token to get user details
      const decodedAccess = jwtDecode(access);

      // Set tokens and user state
      setToken({ access, refresh });
      setAuthUser(decodedAccess);

      // Store tokens in localStorage
      localStorage.setItem('tokens', JSON.stringify({ access, refresh }));

      // Navigate to the previous page or default
      navigate(from);

      // Reset error states
      setResponseError(false);
      setRequestError(false);
    } catch (error) {
      if (error.response) {
        setResponseError(true); // Invalid credentials
      } else if (error.request) {
        setRequestError(true); // Network/server error
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <div>
      <div className="login-container">
        <div className="login-container-window">
          <h1 className='header1'>Log In</h1>
          <div className="login-form">
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="username"
                required
                placeholder="username"
                value={formData.username}
                onChange={handleChange}
              />
              <input
                type="password"
                name="password"
                required
                placeholder="password"
                value={formData.password}
                onChange={handleChange}
              />
              <input type="submit" value="Log In" />
            </form>
          </div>
          <div className='errors'>
            {responseError ? <p>Invalid username or password. Try Again</p> : 
             requestError ? <p>Error in the server, please try in a few minutes.</p> : 
             <p></p>}
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
