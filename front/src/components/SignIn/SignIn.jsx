import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignIn.css';
import axios from 'axios';

const SignIn = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate(); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://127.0.0.1:5000/signin/", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 201) {
        console.log('Signin successful');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error during sign-up:', error);
    }
  };

  return (
    <div>
      <div className="login-container">
        <div className="login-container-window">
          <h1 className='header1'>Sign Up</h1>
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
                type="email"
                name="email"
                required
                placeholder="email address"
                value={formData.email}
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
              <input type="submit" value="Sign Up" />
            </form>
          </div>
          <div className="links">
            <Link to="/login" className="signin-link">
              Already have an account? Log in
            </Link>
            <Link to="/recover_account" className="signin-link">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
