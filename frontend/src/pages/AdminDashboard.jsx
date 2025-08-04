// frontend/src/pages/AdminDashboard.jsx - Enhanced Version

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AlertBox from '../components/AlertBox';
import DiffViewer from '../components/DiffViewer';

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
      const response = await axios.get('http://localhost:8000/api/admin/reports/generate?days=7', {
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

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'document_tampering': return '🔄';
      case 'data_leak_attempt': return '🚨';
      case 'cross_department_access': return '🔒';
      case 'external_tampering': return '⚠️';
      case 'data_sabotage_attempt': return '💥';
      default: return '🔍';
    }
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
    return <div>Loading admin dashboard...</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <h1>🛡️ Security Command Center</h1>
        <div className="user-info">
          <span>👨‍💼 {user.username} (Administrator)</span>
          <button className="btn btn-success" onClick={generateReport}>
            📊 Generate Report
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
            {/* Enhanced Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
              <div className="card" style={{ textAlign: 'center', background: '#fff3cd', border: '2px solid #ffc107' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>🚨 Active Alerts</h3>
                <h1 style={{ margin: '0', color: '#856404' }}>{dashboardData.summary.total_alerts}</h1>
                <small>Security incidents</small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#f8d7da', border: '2px solid #dc3545' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>⚠️ High Risk</h3>
                <h1 style={{ margin: '0', color: '#721c24' }}>{dashboardData.summary.high_risk_alerts}</h1>
                <small>Critical threats</small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#d1ecf1', border: '2px solid #17a2b8' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>🔄 Modifications</h3>
                <h1 style={{ margin: '0', color: '#0c5460' }}>{documentModifications.length}</h1>
                <small>Document changes</small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#ffeaa7', border: '2px solid #fd7e14' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#8b4513' }}>🚨 Data Leaks</h3>
                <h1 style={{ margin: '0', color: '#8b4513' }}>{dataLeakAttempts.length}</h1>
                <small>Unauthorized access</small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#d4edda', border: '2px solid #28a745' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>📊 Access Events</h3>
                <h1 style={{ margin: '0', color: '#155724' }}>{dashboardData.summary.recent_access}</h1>
                <small>Total activities</small>
              </div>
              
              <div className="card" style={{ textAlign: 'center', background: '#e2e3e5', border: '2px solid #6c757d' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>🔍 Anomalies</h3>
                <h1 style={{ margin: '0', color: '#495057' }}>{dashboardData.summary.anomalous_activities}</h1>
                <small>Suspicious behavior</small>
              </div>
            </div>

            {/* Enhanced Tab Navigation */}
            <div className="card">
              <div style={{ borderBottom: '2px solid #ddd', marginBottom: '20px', padding: '10px 0' }}>
                {[
                  { key: 'overview', label: '📋 Overview', icon: '📊' },
                  { key: 'alerts', label: '🚨 Security Alerts', icon: '⚠️' },
                  { key: 'tampering', label: '🔄 Document Changes', icon: '📝' },
                  { key: 'data-leaks', label: '🚨 Data Leak Attempts', icon: '🔒' },
                  { key: 'access', label: '📈 Access Logs', icon: '📋' }
                ].map(tab => (
                  <button 
                    key={tab.key}
                    className="btn" 
                    onClick={() => setSelectedTab(tab.key)}
                    style={{ 
                      marginRight: '10px', 
                      marginBottom: '5px',
                      background: selectedTab === tab.key ? '#007bff' : '#6c757d',
                      transform: selectedTab === tab.key ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {selectedTab === 'overview' && (
                <div>
                  <h3>🎯 Security Overview</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                    <div className="card" style={{ background: '#f8f9fa' }}>
                      <h4>🚨 Threat Summary</h4>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          🔴 Active Alerts: <strong>{dashboardData.summary.total_alerts}</strong>
                        </li>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          ⚠️ High Risk Events: <strong>{dashboardData.summary.high_risk_alerts}</strong>
                        </li>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          🔄 Document Tampering: <strong>{documentModifications.filter(m => m.modification_type === 'content_modification').length}</strong>
                        </li>
                        <li style={{ padding: '5px 0', borderBottom: '1px solid #eee' }}>
                          🚨 Data Leak Attempts: <strong>{dataLeakAttempts.length}</strong>
                        </li>
                        <li style={{ padding: '5px 0' }}>
                          🔍 Anomalous Behavior: <strong>{dashboardData.summary.anomalous_activities}</strong>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="card" style={{ background: '#f8f9fa' }}>
                      <h4>📈 System Health</h4>
                      <div style={{ padding: '15px' }}>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>🟢 Status:</strong> 
                          <span style={{ color: '#28a745', marginLeft: '10px' }}>Operational</span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>🕐 Last Update:</strong> 
                          <span style={{ marginLeft: '10px' }}>{new Date().toLocaleString()}</span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                          <strong>🛡️ Protection Level:</strong> 
                          <span style={{ color: '#007bff', marginLeft: '10px' }}>Maximum</span>
                        </div>
                        <div>
                          <strong>🔍 Monitoring:</strong> 
                          <span style={{ color: '#28a745', marginLeft: '10px' }}>Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Critical Events */}
                  <div className="card" style={{ marginTop: '20px', background: '#fff5f5', border: '1px solid #fed7d7' }}>
                    <h4 style={{ color: '#c53030' }}>🚨 Recent Critical Events</h4>
                    {dashboardData.alerts.filter(alert => alert.risk_score >= 0.7).slice(0, 3).map(alert => (
                      <div key={alert.id} style={{ 
                        padding: '10px', 
                        margin: '5px 0', 
                        background: '#fed7d7', 
                        borderRadius: '5px',
                        borderLeft: '4px solid #c53030'
                      }}>
                        <strong>{getAlertTypeIcon(alert.alert_type)} {alert.alert_type.replace('_', ' ').toUpperCase()}</strong>
                        <br />
                        <small>{alert.description}</small>
                        <br />
                        <small>User: {alert.username} | Time: {new Date(alert.timestamp).toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTab === 'alerts' && (
                <div>
                  <h3>🚨 Security Alerts ({dashboardData.alerts.length})</h3>
                  {dashboardData.alerts.length === 0 ? (
                    <div className="alert alert-success">
                      ✅ No active security alerts. System is secure.
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
                  <h3>🔄 Document Modification Analysis ({documentModifications.length})</h3>
                  {documentModifications.length === 0 ? (
                    <div className="alert alert-info">
                      📝 No document modifications detected.
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
                        <h4>📊 Modification Summary</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
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
                            <th>📄 Document</th>
                            <th>👤 Modified By</th>
                            <th>📊 Changes</th>
                            <th>⏰ Time</th>
                            <th>🔍 Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentModifications.map(mod => {
                            const diffStats = JSON.parse(mod.diff_stats || '{}');
                            return (
                              <tr key={mod.id}>
                                <td>📄 {mod.document_name}</td>
                                <td>{mod.username}</td>
                                <td>
                                  <div style={{ fontSize: '12px' }}>
                                    <span style={{ color: '#28a745' }}>+{diffStats.added_lines || 0}</span>
                                    {' / '}
                                    <span style={{ color: '#dc3545' }}>-{diffStats.removed_lines || 0}</span>
                                    <br />
                                    <small>{diffStats.change_percentage?.toFixed(1) || 0}% changed</small>
                                  </div>
                                </td>
                                <td>{new Date(mod.timestamp).toLocaleString()}</td>
                                <td>
                                  <button 
                                    className="btn" 
                                    style={{ fontSize: '12px' }}
                                    onClick={() => viewModificationDetails(mod)}
                                  >
                                    🔍 View Diff
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
                    <div style={{ 
                      position: 'fixed', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      background: 'rgba(0,0,0,0.8)', 
                      zIndex: 1000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ 
                        background: 'white', 
                        padding: '20px', 
                        borderRadius: '8px', 
                        maxWidth: '90%', 
                        maxHeight: '90%', 
                        overflow: 'auto'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h3>🔄 Document Modification Details</h3>
                          <button 
                            className="btn btn-danger"
                            onClick={() => setSelectedModification(null)}
                          >
                            ✕ Close
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
                  <h3>🚨 Data Leak Attempts Analysis ({dataLeakAttempts.length})</h3>
                  {dataLeakAttempts.length === 0 ? (
                    <div className="alert alert-success">
                      ✅ No data leak attempts detected. Security is strong.
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '20px', padding: '15px', background: '#fff5f5', borderRadius: '8px', border: '1px solid #fed7d7' }}>
                        <h4>🚨 Leak Attempt Summary</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
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
                            <th>👤 User</th>
                            <th>🎯 Target Dept</th>
                            <th>📄 Document</th>
                            <th>🎭 Action</th>
                            <th>📊 Risk</th>
                            <th>🛡️ Status</th>
                            <th>⏰ Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataLeakAttempts.map(attempt => (
                            <tr key={attempt.id} style={{ 
                              background: attempt.risk_score >= 0.8 ? '#fff5f5' : 'transparent' 
                            }}>
                              <td>{attempt.username}</td>
                              <td>
                                <span style={{ 
                                  padding: '2px 6px', 
                                  background: '#dc3545', 
                                  color: 'white', 
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}>
                                  {attempt.target_department}
                                </span>
                              </td>
                              <td>{attempt.document_name}</td>
                              <td>
                                <span style={{ 
                                  padding: '2px 6px', 
                                  background: '#ffc107', 
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}>
                                  {attempt.action_attempted}
                                </span>
                              </td>
                              <td>
                                <span className={`risk-score ${getRiskScoreClass(attempt.risk_score)}`}>
                                  {getRiskScoreText(attempt.risk_score)}
                                </span>
                              </td>
                              <td>
                                {/* {attempt.blocked ?  */}
                                  <span style={{ color: '#28a745' }}>🛡️ BLOCKED</span> {/*:*/} 
                                  {/* <span style={{ color: '#dc3545' }}>⚠️ ALLOWED</span> */}
                                {/* } */}
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
                  <h3>📈 Recent Access Logs</h3>
                  {dashboardData.recent_access.length === 0 ? (
                    <p>No recent access logs.</p>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>👤 User</th>
                          <th>📄 Document</th>
                          <th>🎯 Action</th>
                          <th>⏰ Time</th>
                          <th>📊 Risk Score</th>
                          <th>🚩 Status</th>
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
                              <span style={{ 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                background: log.action === 'read' ? '#d1ecf1' : 
                                           log.action === 'upload' ? '#d4edda' : 
                                           log.action.includes('cross_department') ? '#f8d7da' : '#e2e3e5',
                                color: log.action === 'read' ? '#0c5460' : 
                                       log.action === 'upload' ? '#155724' : 
                                       log.action.includes('cross_department') ? '#721c24' : '#495057'
                              }}>
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
                                <span style={{ color: '#dc3545' }}>🚩 Anomalous</span> : 
                                <span style={{ color: '#28a745' }}>✅ Normal</span>
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