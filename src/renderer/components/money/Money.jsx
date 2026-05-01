import React from 'react';
import '../uploader/Uploader.css';

function Money() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>Money Management</h1>
        <p className="tab-description">Track your earnings and expenses</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
        <h2>Coming Soon</h2>
        <p>This component is being migrated from the old codebase</p>
      </div>
    </div>
  );
}

export default Money;
