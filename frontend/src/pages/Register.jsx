import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    department: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const departments = ['HR', 'Finance', 'Legal', 'IT', 'Operations'];

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
      await axios.post('http://localhost:8000/api/auth/register', formData);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ maxWidth: '400px', margin: '50px auto' }}>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
            📝 Register New User
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
                placeholder="Enter username"
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
                placeholder="Enter password"
              />
            </div>

            <div className="form-group">
              <label>Department:</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Role:</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn" 
              disabled={loading}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/login">Already have an account? Login here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;