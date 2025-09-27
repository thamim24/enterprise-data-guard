import React from 'react';
import './App.css';

function App() {
  console.log('Test App rendering...');
  
  return (
    <div className="App">
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🛡️ Enterprise Data Guard</h1>
        <p>Test App is working!</p>
        <div className="card" style={{ maxWidth: '400px', margin: '20px auto' }}>
          <h3>System Status</h3>
          <div className="alert alert-success">
            ✅ Frontend is loading correctly
          </div>
          <div className="alert alert-info">
            🔧 Ready for full application
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
