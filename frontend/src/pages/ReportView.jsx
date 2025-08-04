import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const ReportView = ({ user }) => {
  const { reportId } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:8000/api/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReportData(response.data);
      } catch (error) {
        setError('Failed to fetch report');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) {
    return <div>Loading report...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2>📊 Security Report</h2>
        
        {reportData ? (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h3>Report Summary</h3>
              <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
              <p><strong>Report ID:</strong> {reportId}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3>Key Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4>Total Alerts</h4>
                  <p style={{ fontSize: '24px', margin: '0', color: '#dc3545' }}>
                    {reportData.summary?.total_alerts || 0}
                  </p>
                </div>
                <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4>High Risk Events</h4>
                  <p style={{ fontSize: '24px', margin: '0', color: '#fd7e14' }}>
                    {reportData.summary?.high_risk_events || 0}
                  </p>
                </div>
                <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <h4>Access Events</h4>
                  <p style={{ fontSize: '24px', margin: '0', color: '#20c997' }}>
                    {reportData.summary?.access_events || 0}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3>Detailed Analysis</h3>
              <p>This report provides a comprehensive overview of system security events and potential threats.</p>
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  className="btn" 
                  onClick={() => window.print()}
                >
                  🖨️ Print Report
                </button>
                
                <button 
                  className="btn"
                  style={{ marginLeft: '10px' }}
                  onClick={() => window.history.back()}
                >
                  ← Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p>No report data available.</p>
        )}
      </div>
    </div>
  );
};

export default ReportView;