import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import './SignIn.css';

const SignIn = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  return (
    <div>
      <div className="login-container">
        <div className="login-container-window">
          <h1 className='header1'>Sign In</h1>
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
                type="email"
                name="email"
                required
                placeholder="email address"
                value={formData.email}
              />

              <input
                type="password"
                name="password"
                required
                placeholder="password"
                value={formData.password}
              />
              <input type="submit" value="Log In" />
            </form>
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

export default SignIn;
