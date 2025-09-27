import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components dynamically to avoid import issues
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const UserDashboard = React.lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ReportView = React.lazy(() => import('./pages/ReportView'));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚀 App useEffect starting...');
    
    try {
      // Check if user is logged in from localStorage
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      console.log('📝 Token:', token ? 'exists' : 'none');
      console.log('👤 UserData:', userData ? 'exists' : 'none');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log('✅ Parsed user:', parsedUser);
          setUser(parsedUser);
        } catch (parseError) {
          console.error('❌ Error parsing user data:', parseError);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      console.log('⏰ Setting loading to false');
      setLoading(false);
    } catch (err) {
      console.error('💥 Fatal error in App useEffect:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>❌ Application Error</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>🔄 Reload App</button>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <React.Suspense fallback={<div style={{padding: '20px', textAlign: 'center'}}>Loading component...</div>}>
          <Routes>
            <Route 
              path="/login" 
              element={!user ? <Login onLogin={login} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/register" 
              element={!user ? <Register /> : <Navigate to="/" />} 
            />
            <Route 
              path="/" 
              element={
                user ? (
                  user.role === 'admin' ? 
                  <AdminDashboard user={user} onLogout={logout} /> : 
                  <UserDashboard user={user} onLogout={logout} />
                ) : (
                  <Navigate to="/login" />
                )
              } 
            />
            <Route 
              path="/reports/:reportId" 
              element={user ? <ReportView user={user} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </React.Suspense>
      </div>
    </Router>
  );
}

export default App;