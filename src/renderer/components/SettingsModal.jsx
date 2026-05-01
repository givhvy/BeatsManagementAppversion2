import React from 'react';
import './SettingsModal.css';

function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="settings-section">
            <h3>Application</h3>
            <div className="setting-item">
              <label>Theme</label>
              <select className="setting-select">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Language</label>
              <select className="setting-select">
                <option value="en">English</option>
                <option value="vi">Vietnamese</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Video Rendering</h3>
            <div className="setting-item">
              <label>Default Resolution</label>
              <select className="setting-select">
                <option value="1920x1080">1920×1080 (16:9)</option>
                <option value="1080">1080×1080 (1:1)</option>
                <option value="720">1280×720 (16:9)</option>
              </select>
            </div>
            <div className="setting-item">
              <label>Output Format</label>
              <select className="setting-select">
                <option value="mp4">MP4</option>
                <option value="mov">MOV</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>System Status</h3>
            <div className="status-item">
              <span className="status-label">YouTube Server</span>
              <span className="status-badge offline">Offline</span>
            </div>
            <div className="status-item">
              <span className="status-label">Ollama AI</span>
              <span className="status-badge offline">Offline</span>
            </div>
          </div>

          <div className="settings-section">
            <h3>About</h3>
            <div className="about-info">
              <p><strong>Beats Management Studio</strong></p>
              <p>Version 2.0.0</p>
              <p>Built with React + Vite + Electron</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
