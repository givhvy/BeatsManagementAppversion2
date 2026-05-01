import React from 'react';
import './Midi.css';

function Midi() {
  return (
    <div className="tab-section">
      <div className="tab-header">
        <h1>MIDI Packs</h1>
        <p className="tab-description">Manage your MIDI file collections</p>
      </div>
      <div className="coming-soon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M6 8h.01"/>
          <path d="M10 8h.01"/>
          <path d="M14 8h.01"/>
          <path d="M18 8h.01"/>
          <path d="M8 12v4"/>
          <path d="M12 12v4"/>
          <path d="M16 12v4"/>
        </svg>
        <h2>MIDI Packs</h2>
        <p>Organize and manage your MIDI files</p>
      </div>
    </div>
  );
}

export default Midi;
