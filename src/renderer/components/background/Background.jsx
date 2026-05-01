import React from 'react';
import './Background.css';

function Background() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>Background Music</h1>
        <p className="tab-description">Manage background music packs</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
          <path d="M9 5v13"/>
        </svg>
        <h2>Background Music</h2>
        <p>Organize your background music library</p>
      </div>
    </div>
  );
}

export default Background;
