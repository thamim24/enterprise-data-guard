import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AlertBox from '../components/AlertBox';
import DiffViewer from '../components/DiffViewer';
import '../styles/Professional.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [documentModifications, setDocumentModifications] = useState([]);
  const [dataLeakAttempts, setDataLeakAttempts] = useState([]);
  const [selectedModification, setSelectedModification] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      setError('Failed to fetch dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentModifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/admin/modifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocumentModifications(response.data.modifications || []);
    } catch (error) {
      console.error('Failed to fetch modifications:', error);
    }
  };

  const fetchDataLeakAttempts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/admin/data-leaks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDataLeakAttempts(response.data.attempts || []);
    } catch (error) {
      console.error('Failed to fetch data leak attempts:', error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchDocumentModifications();
    fetchDataLeakAttempts();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchDocumentModifications();
      fetchDataLeakAttempts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const generateReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/admin/reports/generate?days=7&format=pdf', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.download_url) {
        window.open(`http://localhost:8000${response.data.download_url}`, '_blank');
      }
      
      alert('Security report generated successfully!');
    } catch (error) {
      alert('Failed to generate report');
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:8000/api/admin/alerts/${alertId}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchDashboardData();
    } catch (error) {
      alert('Failed to resolve alert');
    }
  };

  const getRiskScoreClass = (score) => {
    if (score >= 0.7) return 'risk-high';
    if (score >= 0.4) return 'risk-medium';
    return 'risk-low';
  };

  const getRiskScoreText = (score) => {
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  };

  const viewModificationDetails = async (modification) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:8000/api/admin/modification-diff/${modification.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedModification({...modification, diffData: response.data});
    } catch (error) {
      alert('Failed to fetch modification details');
    }
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <h1>Enterprise Data Guard</h1>
        <div className="user-info">
          <span>{user.username} (Administrator)</span>
          <button className="btn btn-success" onClick={generateReport}>
            Generate Report
          </button>
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

        {dashboardData && (
          <>
            {/* Enhanced Summary Metrics */}
            <div className="metrics-grid">
              <div className="metric-card alerts">
                <h3>Active Alerts</h3>
                <div className="metric-value">{dashboardData.summary.total_alerts}</div>
                <div className="metric-label">Security incidents</div>
              </div>
              
              <div className="metric-card critical">
                <h3>High Risk</h3>
                <div className="metric-value">{dashboardData.summary.high_risk_alerts}</div>
                <div className="metric-label">Critical threats</div>
              </div>
              
              <div className="metric-card info">
                <h3>Modifications</h3>
                <div className="metric-value">{documentModifications.length}</div>
                <div className="metric-label">Document changes</div>
              </div>
              
              <div className="metric-card alerts">
                <h3>Data Leaks</h3>
                <div className="metric-value">{dataLeakAttempts.length}</div>
                <div className="metric-label">Unauthorized access</div>
              </div>
              
              <div className="metric-card success">
                <h3>Access Events</h3>
                <div className="metric-value">{dashboardData.summary.recent_access}</div>
                <div className="metric-label">Total activities</div>
              </div>
              
              <div className="metric-card neutral">
                <h3>Anomalies</h3>
                <div className="metric-value">{dashboardData.summary.anomalous_activities}</div>
                <div className="metric-label">Suspicious behavior</div>
              </div>
            </div>

            {/* Enhanced Tab Navigation */}
            <div className="card">
              <div className="tab-navigation">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'alerts', label: 'Security Alerts' },
                  { key: 'tampering', label: 'Document Changes' },
                  { key: 'data-leaks', label: 'Data Leak Attempts' },
                  { key: 'access', label: 'Access Logs' }
                ].map(tab => (
                  <button 
                    key={tab.key}
                    className={`tab-button ${selectedTab === tab.key ? 'active' : ''}`}
                    onClick={() => setSelectedTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {selectedTab === 'overview' && (
                <div>
                  <h3>Security Overview</h3>
                  <div className="content-grid">
                    <div className="summary-section">
                      <h4>Threat Summary</h4>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          Active Alerts: <strong>{dashboardData.summary.total_alerts}</strong>
                        </li>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          High Risk Events: <strong>{dashboardData.summary.high_risk_alerts}</strong>
                        </li>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          Document Tampering: <strong>{documentModifications.filter(m => m.modification_type === 'content_modification').length}</strong>
                        </li>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          Data Leak Attempts: <strong>{dataLeakAttempts.length}</strong>
                        </li>
                        <li style={{ padding: '5px 0' }}>
                          Anomalous Behavior: <strong>{dashboardData.summary.anomalous_activities}</strong>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="summary-section">
                      <h4>System Health</h4>
                      <div style={{ padding: '15px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Status:</strong> 
                          <span className="status-badge status-normal" style={{ marginLeft: '10px' }}>Operational</span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Last Update:</strong> 
                          <span style={{ marginLeft: '10px' }}>{new Date().toLocaleString()}</span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>Protection Level:</strong> 
                          <span style={{ color: '#3182ce', marginLeft: '10px' }}>Maximum</span>
                        </div>
                        <div>
                          <strong>Monitoring:</strong> 
                          <span className="status-badge status-normal" style={{ marginLeft: '10px' }}>Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === 'alerts' && (
                <div className={dashboardData.alerts.length > 0 ? "alerts-section danger" : "alerts-section safe"}>
                  <h3>Security Alerts ({dashboardData.alerts.length})</h3>
                  {dashboardData.alerts.length === 0 ? (
                    <div className="alert alert-success">
                      No active security alerts. System is secure.
                    </div>
                  ) : (
                    <div>
                      {dashboardData.alerts.map(alert => (
                        <AlertBox 
                          key={alert.id} 
                          alert={alert} 
                          onResolve={() => resolveAlert(alert.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'tampering' && (
                <div>
                  <h3>Document Modification Analysis ({documentModifications.length})</h3>
                  {documentModifications.length === 0 ? (
                    <div className="alert alert-info">
                      No document modifications detected.
                    </div>
                  ) : (
                    <div>
                      <div className="summary-section">
                        <h4>Modification Summary</h4>
                        <div className="content-grid">
                          <div>
                            <strong>Total Modifications:</strong> {documentModifications.length}
                          </div>
                          <div>
                            <strong>Today:</strong> {documentModifications.filter(m => 
                              new Date(m.timestamp).toDateString() === new Date().toDateString()
                            ).length}
                          </div>
                          <div>
                            <strong>High Impact:</strong> {documentModifications.filter(m => 
                              JSON.parse(m.diff_stats || '{}').change_percentage > 50
                            ).length}
                          </div>
                        </div>
                      </div>

                      <table className="table">
                        <thead>
                          <tr>
                            <th>Document</th>
                            <th>Modified By</th>
                            <th>Changes</th>
                            <th>Time</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentModifications.map(mod => {
                            const diffStats = JSON.parse(mod.diff_stats || '{}');
                            return (
                              <tr key={mod.id}>
                                <td>{mod.document_name}</td>
                                <td>{mod.username}</td>
                                <td>
                                  <div style={{ fontSize: '12px' }}>
                                    <span style={{ color: '#38a169' }}>+{diffStats.added_lines || 0}</span>
                                    {' / '}
                                    <span style={{ color: '#e53e3e' }}>-{diffStats.removed_lines || 0}</span>
                                    <br />
                                    <small>{diffStats.change_percentage?.toFixed(1) || 0}% changed</small>
                                  </div>
                                </td>
                                <td>{new Date(mod.timestamp).toLocaleString()}</td>
                                <td>
                                  <button 
                                    className="btn btn-small" 
                                    onClick={() => viewModificationDetails(mod)}
                                  >
                                    View Diff
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Modification Details Modal */}
                  {selectedModification && (
                    <div className="modal-overlay">
                      <div className="modal-content">
                        <div className="modal-header">
                          <h3>Document Modification Details</h3>
                          <button 
                            className="btn btn-danger"
                            onClick={() => setSelectedModification(null)}
                          >
                            Close
                          </button>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                          <p><strong>Document:</strong> {selectedModification.document_name}</p>
                          <p><strong>Modified by:</strong> {selectedModification.username}</p>
                          <p><strong>Time:</strong> {new Date(selectedModification.timestamp).toLocaleString()}</p>
                        </div>

                        {selectedModification.diffData && (
                          <DiffViewer 
                            oldText={selectedModification.diffData.old_content}
                            newText={selectedModification.diffData.new_content}
                            fileName={selectedModification.document_name}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'data-leaks' && (
                <div>
                  <h3>Data Leak Attempts Analysis ({dataLeakAttempts.length})</h3>
                  {dataLeakAttempts.length === 0 ? (
                    <div className="alert alert-success">
                      No data leak attempts detected. Security is strong.
                    </div>
                  ) : (
                    <div>
                      <div className="summary-section">
                        <h4>Leak Attempt Summary</h4>
                        <div className="content-grid">
                          <div>
                            <strong>Total Attempts:</strong> {dataLeakAttempts.length}
                          </div>
                          <div>
                            <strong>Blocked:</strong> {dataLeakAttempts.filter(a => a.blocked).length}
                          </div>
                          <div>
                            <strong>High Risk:</strong> {dataLeakAttempts.filter(a => a.risk_score >= 0.8).length}
                          </div>
                          <div>
                            <strong>Today:</strong> {dataLeakAttempts.filter(a => 
                              new Date(a.timestamp).toDateString() === new Date().toDateString()
                            ).length}
                          </div>
                        </div>
                      </div>

                      <table className="table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Target Dept</th>
                            <th>Document</th>
                            <th>Action</th>
                            <th>Risk</th>
                            <th>Status</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataLeakAttempts.map(attempt => (
                            <tr key={attempt.id} style={{ 
                              background: attempt.risk_score >= 0.8 ? '#fff5f5' : 'transparent' 
                            }}>
                              <td>{attempt.username}</td>
                              <td>
                                <span className="dept-badge">
                                  {attempt.target_department}
                                </span>
                              </td>
                              <td>{attempt.document_name}</td>
                              <td>
                                <span className="action-badge">
                                  {attempt.action_attempted}
                                </span>
                              </td>
                              <td>
                                <span className={`risk-score ${getRiskScoreClass(attempt.risk_score)}`}>
                                  {getRiskScoreText(attempt.risk_score)}
                                </span>
                              </td>
                              <td>
                                {attempt.blocked ? 
                                  <span className="status-badge status-blocked">BLOCKED</span> : 
                                  <span className="status-badge status-allowed">ALLOWED</span>
                                }
                              </td>
                              <td>{new Date(attempt.timestamp).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedTab === 'access' && (
                <div>
                  <h3>Recent Access Logs</h3>
                  {dashboardData.recent_access.length === 0 ? (
                    <p>No recent access logs.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Document</th>
                          <th>Action</th>
                          <th>Time</th>
                          <th>Risk Score</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recent_access.map(log => (
                          <tr key={log.id} style={{ 
                            background: log.anomaly_flag ? '#fff3cd' : 'transparent' 
                          }}>
                            <td>{log.username} ({log.department})</td>
                            <td>{log.document_name || 'N/A'}</td>
                            <td>
                              <span className={`action-badge action-${log.action}`}>
                                {log.action.toUpperCase()}
                              </span>
                            </td>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                            <td>
                              <span className={`risk-score ${getRiskScoreClass(log.risk_score)}`}>
                                {getRiskScoreText(log.risk_score)} ({log.risk_score.toFixed(2)})
                              </span>
                            </td>
                            <td>
                              {log.anomaly_flag ? 
                                <span className="status-badge status-anomalous">Anomalous</span> : 
                                <span className="status-badge status-normal">Normal</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
