// frontend/src/components/DiffViewer.jsx - Document Diff Display Component

import React, { useState } from 'react';

const DiffViewer = ({ oldText, newText, fileName }) => {
  const [viewMode, setViewMode] = useState('unified'); // 'unified' or 'split'

  // Simple diff algorithm
  const generateDiff = (oldText, newText) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const diff = [];
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine === newLine) {
        diff.push({ type: 'unchanged', oldLineNum: i + 1, newLineNum: i + 1, content: oldLine });
      } else if (oldLine && !newLine) {
        diff.push({ type: 'removed', oldLineNum: i + 1, newLineNum: null, content: oldLine });
      } else if (!oldLine && newLine) {
        diff.push({ type: 'added', oldLineNum: null, newLineNum: i + 1, content: newLine });
      } else {
        diff.push({ type: 'removed', oldLineNum: i + 1, newLineNum: null, content: oldLine });
        diff.push({ type: 'added', oldLineNum: null, newLineNum: i + 1, content: newLine });
      }
    }
    
    return diff;
  };

  const diff = generateDiff(oldText, newText);
  
  const getLineStyle = (type) => {
    switch (type) {
      case 'added':
        return { backgroundColor: '#d4edda', borderLeft: '3px solid #28a745' };
      case 'removed':
        return { backgroundColor: '#f8d7da', borderLeft: '3px solid #dc3545' };
      case 'unchanged':
        return { backgroundColor: '#f8f9fa', borderLeft: '3px solid #dee2e6' };
      default:
        return {};
    }
  };

  const getLinePrefix = (type) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'unchanged':
        return ' ';
      default:
        return ' ';
    }
  };

  const stats = {
    added: diff.filter(line => line.type === 'added').length,
    removed: diff.filter(line => line.type === 'removed').length,
    unchanged: diff.filter(line => line.type === 'unchanged').length
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderBottom: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h4 style={{ margin: 0, color: '#333' }}>📄 {fileName}</h4>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
            <span style={{ color: '#28a745' }}>+{stats.added} additions</span>
            {' | '}
            <span style={{ color: '#dc3545' }}>-{stats.removed} deletions</span>
            {' | '}
            <span style={{ color: '#6c757d' }}>{stats.unchanged} unchanged</span>
          </div>
        </div>
        
        <div>
          <button
            className={`btn ${viewMode === 'unified' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('unified')}
            style={{ marginRight: '10px', fontSize: '12px', padding: '6px 12px' }}
          >
            📄 Unified
          </button>
          <button
            className={`btn ${viewMode === 'split' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('split')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            📊 Split
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div style={{ maxHeight: '500px', overflow: 'auto', background: 'white' }}>
        {viewMode === 'unified' ? (
          // Unified view
          <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
            {diff.map((line, index) => (
              <div
                key={index}
                style={{
                  ...getLineStyle(line.type),
                  padding: '2px 10px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ 
                  minWidth: '60px', 
                  color: '#666', 
                  fontSize: '12px',
                  marginRight: '10px'
                }}>
                  {line.oldLineNum || ''} {line.newLineNum || ''}
                </span>
                <span style={{ 
                  marginRight: '10px',
                  fontWeight: 'bold',
                  color: line.type === 'added' ? '#28a745' : line.type === 'removed' ? '#dc3545' : '#6c757d'
                }}>
                  {getLinePrefix(line.type)}
                </span>
                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {line.content}
                </span>
              </div>
            ))}
          </div>
        ) : (
          // Split view
          <div style={{ display: 'flex', fontFamily: 'monospace', fontSize: '14px' }}>
            {/* Old content */}
            <div style={{ flex: 1, borderRight: '1px solid #ddd' }}>
              <div style={{ 
                background: '#f8d7da', 
                padding: '8px 12px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #ddd'
              }}>
                📄 Original
              </div>
              {oldText.split('\n').map((line, index) => (
                <div
                  key={index}
                  style={{
                    padding: '2px 10px',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#fff',
                    minHeight: '20px'
                  }}
                >
                  <span style={{ color: '#666', marginRight: '10px', fontSize: '12px' }}>
                    {index + 1}
                  </span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{line}</span>
                </div>
              ))}
            </div>

            {/* New content */}
            <div style={{ flex: 1 }}>
              <div style={{ 
                background: '#d4edda', 
                padding: '8px 12px', 
                fontWeight: 'bold',
                borderBottom: '1px solid #ddd'
              }}>
                📄 Modified
              </div>
              {newText.split('\n').map((line, index) => (
                <div
                  key={index}
                  style={{
                    padding: '2px 10px',
                    borderBottom: '1px solid #f0f0f0',
                    background: '#fff',
                    minHeight: '20px'
                  }}
                >
                  <span style={{ color: '#666', marginRight: '10px', fontSize: '12px' }}>
                    {index + 1}
                  </span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '10px 15px', 
        borderTop: '1px solid #ddd',
        fontSize: '12px',
        color: '#666'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            🔍 Change Impact: {((stats.added + stats.removed) / (stats.added + stats.removed + stats.unchanged) * 100).toFixed(1)}% of document modified
          </span>
          <span>
            📊 Total Lines: {stats.added + stats.removed + stats.unchanged}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;