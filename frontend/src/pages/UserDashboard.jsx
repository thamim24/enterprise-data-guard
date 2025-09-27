import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadForm from '../components/UploadForm';
import '../styles/upload.css';

const UserDashboard = ({ user, onLogout }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/documents/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data.documents);
    } catch (error) {
      setError('Failed to fetch documents');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDownload = async (docId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/documents/download/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert(error.response?.data?.detail || 'Download failed');
    }
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <h1>📁 User Dashboard</h1>
        <div className="user-info">
          <span>👤 {user.username} ({user.department})</span>
          <button className="btn btn-danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="container">
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        <div className="card">
          <h3>📤 Upload Document</h3>
          <UploadForm 
            userDepartment={user.department} 
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        <div className="card">
          <h3>📋 My Department Documents ({user.department})</h3>
          
          {documents.length === 0 ? (
            <p>No documents found in your department.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Department</th>
                  <th>Modified By</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>📄 {doc.name}</td>
                    <td>{doc.department}</td>
                    <td>{doc.modified_by_username || 'System'}</td>
                    <td>{new Date(doc.updated_at).toLocaleString()}</td>
                    <td>
                      <button 
                        className="btn" 
                        onClick={() => handleDownload(doc.id, doc.name)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>📊 Quick Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '20px', background: '#e7f3ff', borderRadius: '8px' }}>
              <h2 style={{ margin: '0', color: '#0066cc' }}>{documents.length}</h2>
              <p style={{ margin: '5px 0 0 0' }}>Available Documents</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f0f9e7', borderRadius: '8px' }}>
              <h2 style={{ margin: '0', color: '#28a745' }}>{user.department}</h2>
              <p style={{ margin: '5px 0 0 0' }}>Your Department</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;