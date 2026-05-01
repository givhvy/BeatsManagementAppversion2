import React from 'react';
import './Beatstars.css';

function Beatstars() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>Beatstars Integration</h1>
        <p className="tab-description">Manage your Beatstars uploads and sales</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <h2>Beatstars Integration</h2>
        <p>Connect and manage your Beatstars account</p>
      </div>
    </div>
  );
}

export default Beatstars;
