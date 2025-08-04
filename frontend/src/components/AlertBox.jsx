// frontend/src/components/AlertBox.jsx - Alert Display Component

import React from 'react';

const AlertBox = ({ alert, onResolve }) => {
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
      case 'unauthorized_access': return '🚨';
      case 'document_modified': return '🔄';
      case 'suspicious_download': return '📥';
      case 'cross_department_access': return '🔒';
      case 'data_leak_attempt': return '💥';
      case 'external_tampering': return '⚠️';
      case 'anomalous_behavior': return '🔍';
      default: return '🔍';
    }
  };

  const getAlertPriorityColor = (riskScore) => {
    if (riskScore >= 0.8) return '#dc3545'; // Red for critical
    if (riskScore >= 0.6) return '#fd7e14'; // Orange for high
    if (riskScore >= 0.4) return '#ffc107'; // Yellow for medium
    return '#28a745'; // Green for low
  };

  return (
    <div 
      className="card" 
      style={{ 
        marginBottom: '15px', 
        borderLeft: `5px solid ${getAlertPriorityColor(alert.risk_score)}`,
        background: alert.risk_score >= 0.7 ? '#fff5f5' : '#f8f9fa'
      }}
    >
      <div style={{ padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '20px', marginRight: '10px' }}>
                {getAlertTypeIcon(alert.alert_type)}
              </span>
              <h4 style={{ margin: 0, color: '#333' }}>
                {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
              </h4>
              <span 
                className={`risk-score ${getRiskScoreClass(alert.risk_score)}`}
                style={{ 
                  marginLeft: '15px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: 'white',
                  background: getAlertPriorityColor(alert.risk_score)
                }}
              >
                {getRiskScoreText(alert.risk_score)} ({alert.risk_score.toFixed(2)})
              </span>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong>👤 User:</strong> {alert.username} 
              {alert.department && <span style={{ color: '#666' }}> ({alert.department})</span>}
            </div>

            {alert.document_name && (
              <div style={{ marginBottom: '8px' }}>
                <strong>📄 Document:</strong> {alert.document_name}
              </div>
            )}

            <div style={{ marginBottom: '8px' }}>
              <strong>📝 Description:</strong> 
              <span style={{ color: '#555', marginLeft: '5px' }}>{alert.description}</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>⏰ Time:</strong> 
              <span style={{ color: '#666', marginLeft: '5px' }}>
                {new Date(alert.timestamp).toLocaleString()}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#888' }}>
              <strong>Status:</strong> {alert.resolved ? '✅ Resolved' : '🔴 Active'}
            </div>
          </div>

          <div style={{ marginLeft: '20px' }}>
            {!alert.resolved && onResolve && (
              <button 
                className="btn btn-success"
                onClick={() => onResolve(alert.id)}
                style={{ 
                  padding: '8px 16px',
                  fontSize: '14px',
                  borderRadius: '4px'
                }}
              >
                ✅ Resolve
              </button>
            )}
          </div>
        </div>

        {/* Additional threat level indicator */}
        {alert.risk_score >= 0.8 && (
          <div 
            style={{ 
              marginTop: '10px',
              padding: '8px 12px',
              background: '#dc3545',
              color: 'white',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🚨 CRITICAL THREAT - Immediate attention required!
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertBox;