import React from 'react';
import './Uploader.css';

function Uploader() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>YouTube Uploader</h1>
        <p className="tab-description">Upload and schedule videos to YouTube channels</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <h2>Coming Soon</h2>
        <p>This component is being migrated from the old codebase</p>
      </div>
    </div>
  );
}

export default Uploader;
