import React, { useState, useEffect } from 'react';
import './BeatsOriginal.css';
import { electron } from '../../shared/electron';

function BeatsOriginal() {
  const [currentFolderType, setCurrentFolderType] = useState('all');
  const [folderPath, setFolderPath] = useState('No folder selected');
  const [beats, setBeats] = useState([]);
  const [packs, setPacks] = useState([]);
  const [currentPackId, setCurrentPackId] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [packFilterText, setPackFilterText] = useState('');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await electron.invoke('load-data');
    if (data) {
      setPacks(data.packs || []);
      // Load other state...
    }
  }

  async function selectFolder() {
    const folder = await electron.invoke('select-folder');
    if (folder) {
      setFolderPath(folder);
      const contents = await electron.invoke('read-folder-contents', folder);
      setBeats(contents.beats || []);
    }
  }

  function switchFolderType(type) {
    setCurrentFolderType(type);
    // Load appropriate beats based on type
  }

  function openPackDetail(packId) {
    setCurrentPackId(packId);
  }

  function closePackDetail() {
    setCurrentPackId(null);
  }

  const currentPack = packs.find(p => p.id === currentPackId);
  const filteredBeats = beats.filter(beat => 
    beat.name.toLowerCase().includes(filterText.toLowerCase())
  );
  const filteredPacks = packs.filter(pack =>
    pack.name.toLowerCase().includes(packFilterText.toLowerCase())
  );

  return (
    <div className="beats-original-container">
      {/* Left Panel - Beats List */}
      <div className="left-panel">
        <div className="panel-header">
          <h2>Beats</h2>
          <button className="btn-secondary" title="Refresh">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${currentFolderType === 'all' ? 'active' : ''}`}
            onClick={() => switchFolderType('all')}
          >
            Beats
          </button>
          <button 
            className={`tab-btn ${currentFolderType === 'tagged' ? 'active' : ''}`}
            onClick={() => switchFolderType('tagged')}
          >
            Untagged
          </button>
          <button 
            className={`tab-btn ${currentFolderType === 'untagged' ? 'active' : ''}`}
            onClick={() => switchFolderType('untagged')}
          >
            Tagged
          </button>
        </div>

        <div className="folder-path">{folderPath}</div>

        <div className="filter-container">
          <input 
            type="text" 
            className="filter-input"
            placeholder="Filter by number (e.g., 1, 2, 3...)"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>

        <div className="beats-list">
          {filteredBeats.length === 0 ? (
            <div className="empty-state">
              <p>No beats found</p>
              <button className="btn-primary" onClick={selectFolder}>
                Select Folder
              </button>
            </div>
          ) : (
            filteredBeats.map(beat => (
              <div key={beat.path} className="beat-item">
                <div className="beat-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>
                <span className="beat-name">{beat.name}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Middle Panel - Packs Grid */}
      <div className="middle-panel">
        <div className="panel-header">
          <h2>Packs</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary">+ Create Pack</button>
          </div>
        </div>

        <div className="total-beats-container">
          <div className="total-beats-header">
            <span className="total-beats-label">Total Beats in All Packs</span>
            <span className="total-beats-count">0/20000</span>
          </div>
          <div className="total-beats-progress-bar">
            <div className="total-beats-progress-fill" style={{ width: '0%' }}></div>
          </div>
        </div>

        <div className="filter-container">
          <input 
            type="text" 
            className="filter-input"
            placeholder="Filter by pack number (e.g., C1, C2, 1, 2...)"
            value={packFilterText}
            onChange={(e) => setPackFilterText(e.target.value)}
          />
        </div>

        <div className="packs-grid">
          {filteredPacks.map(pack => (
            <div 
              key={pack.id} 
              className="pack-card"
              onClick={() => openPackDetail(pack.id)}
            >
              <div className="pack-card-header">
                <h3>{pack.name}</h3>
              </div>
              <div className="pack-count">{pack.beats?.length || 0} beats</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Pack Details */}
      {currentPackId && (
        <div className="right-panel">
          <div className="panel-header">
            <button className="btn-back" onClick={closePackDetail}>← Back</button>
            <input 
              type="text" 
              className="pack-detail-title"
              value={currentPack?.name || ''}
              placeholder="Pack Name"
            />
          </div>
          <div className="pack-detail-content">
            <div className="pack-detail-beats">
              <div className="pack-detail-count">{currentPack?.beats?.length || 0} beats</div>
              {/* Pack beats list */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BeatsOriginal;
