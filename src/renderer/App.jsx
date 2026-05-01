import React, { useState } from 'react';
import { useAppStore } from './shared/store';
import Notifications from './components/Notifications';
import SettingsModal from './components/SettingsModal';
import Beats from './components/beats/Beats';
import Create from './components/create/Create';
import Uploader from './components/uploader/Uploader';
import Progress from './components/progress/Progress';
import Money from './components/money/Money';

function App() {
  const { currentTab, setCurrentTab } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app">
      <Notifications />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      <div className="title-bar">
        <div className="title-bar-left">
          <svg className="app-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <span className="app-title">Beats Management Studio</span>
        </div>
        <button className="settings-btn" onClick={() => setShowSettings(true)} title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m18.2 5.2l-4.2-4.2m-2-2l-4.2-4.2"/>
          </svg>
        </button>
      </div>

      <nav className="nav-bar">
        <button className={`nav-btn ${currentTab === 'beats' ? 'active' : ''}`} onClick={() => setCurrentTab('beats')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
          Beats
        </button>
        <button className={`nav-btn ${currentTab === 'create' ? 'active' : ''}`} onClick={() => setCurrentTab('create')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 15h6M12 9v6"/>
          </svg>
          Create
        </button>
        <button className={`nav-btn ${currentTab === 'uploader' ? 'active' : ''}`} onClick={() => setCurrentTab('uploader')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Uploader
        </button>
        <button className={`nav-btn ${currentTab === 'progress' ? 'active' : ''}`} onClick={() => setCurrentTab('progress')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Progress
        </button>
        <button className={`nav-btn ${currentTab === 'money' ? 'active' : ''}`} onClick={() => setCurrentTab('money')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Money
        </button>
      </nav>

      <main className="main-content">
        {currentTab === 'beats' && <Beats />}
        {currentTab === 'create' && <Create />}
        {currentTab === 'uploader' && <Uploader />}
        {currentTab === 'progress' && <Progress />}
        {currentTab === 'money' && <Money />}
      </main>
    </div>
  );
}

export default App;
