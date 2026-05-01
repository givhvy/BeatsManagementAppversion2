import React from 'react';
import '../uploader/Uploader.css';

function Progress() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>Progress Tracking</h1>
        <p className="tab-description">Track your upload progress and statistics</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <h2>Coming Soon</h2>
        <p>This component is being migrated from the old codebase</p>
      </div>
    </div>
  );
}

export default Progress;
