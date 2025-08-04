import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:8000/api/auth/login', formData);
      const { access_token, user } = response.data;
      onLogin(user, access_token);
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '100px auto' }}>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
            🔐 Enterprise Data Guard
          </h2>
          
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
            </div>

            <button 
              type="submit" 
              className="btn" 
              disabled={loading}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/register">Don't have an account? Register here</Link>
          </div>

          <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
            <small>
              <strong>Demo Accounts:</strong><br/>
              Admin: admin / admin123<br/>
              HR User: john_hr / password123<br/>
              Finance User: sarah_finance / password123
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;