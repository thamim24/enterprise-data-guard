import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadForm from '../components/UploadForm';
import '../styles/Professional.css';

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
    return <div className="loading">Loading dashboard</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <h1>Document Management Portal</h1>
        <div className="user-info">
          <span>{user.username} ({user.department})</span>
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
          <h3>Upload Document</h3>
          <UploadForm 
            userDepartment={user.department} 
            onUploadSuccess={handleUploadSuccess}
          />
        </div>

        <div className="card">
          <h3>My Department Documents ({user.department})</h3>
          
          {documents.length === 0 ? (
            <div className="alert alert-info">
              No documents found in your department.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Department</th>
                  <th>Uploaded By</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>{doc.name}</td>
                    <td>
                      <span className={`dept-badge dept-${doc.department.toLowerCase()}`}>
                        {doc.department}
                      </span>
                    </td>
                    <td>{doc.modified_by_username || 'System'}</td>
                    <td>{new Date(doc.updated_at).toLocaleString()}</td>
                    <td>
                      <button 
                        className="btn btn-primary btn-small" 
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
          <h3>Quick Statistics</h3>
          <div className="metrics-grid">
            <div className="metric-card info">
              <h3>Available Documents</h3>
              <div className="metric-value">{documents.length}</div>
              <div className="metric-label">In your department</div>
            </div>
            <div className="metric-card success">
              <h3>Your Department</h3>
              <div className="metric-value" style={{ fontSize: '1.5rem' }}>{user.department}</div>
              <div className="metric-label">Access level</div>
            </div>
            <div className="metric-card neutral">
              <h3>Recent Activity</h3>
              <div className="metric-value">
                {documents.filter(doc => {
                  const updateDate = new Date(doc.updated_at);
                  const today = new Date();
                  const diffTime = Math.abs(today - updateDate);
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 7;
                }).length}
              </div>
              <div className="metric-label">Updated this week</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Recent Documents</h3>
          {documents.length > 0 ? (
            <div className="content-grid">
              {documents.slice(0, 6).map(doc => (
                <div key={doc.id} className="summary-section">
                  <h4>{doc.name}</h4>
                  <p><strong>Department:</strong> {doc.department}</p>
                  <p><strong>Last Modified:</strong> {new Date(doc.updated_at).toLocaleDateString()}</p>
                  <p><strong>Modified By:</strong> {doc.modified_by_username || 'System'}</p>
                  <button 
                    className="btn btn-primary btn-small mt-2" 
                    onClick={() => handleDownload(doc.id, doc.name)}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info">
              No recent documents to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
