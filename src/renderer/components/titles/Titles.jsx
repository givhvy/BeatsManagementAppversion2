import React from 'react';
import './Titles.css';

function Titles() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>Title Templates</h1>
        <p className="tab-description">Create and manage video title templates</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <h2>Title Templates</h2>
        <p>Design templates for your video titles</p>
      </div>
    </div>
  );
}

export default Titles;
