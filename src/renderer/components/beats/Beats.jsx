import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../shared/store';
import { electron } from '../../shared/electron';
import { showNotification } from '../../shared/notifications';
import './Beats.css';

function Beats() {
  const {
    currentFolderType,
    setCurrentFolderType,
    folders,
    updateFolder,
    beats,
    setBeats,
    packs,
    setPacks,
    loadData,
    saveData,
  } = useAppStore();

  const [filterValue, setFilterValue] = useState('');
  const [currentBeats, setCurrentBeats] = useState([]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle folder type switching
  const handleFolderTypeChange = async (type) => {
    setCurrentFolderType(type);
    
    const folder = folders[type];
    if (folder.path) {
      await loadBeatsForFolder(type, folder.path);
    }
  };

  // Select folder
  const handleSelectFolder = async () => {
    const folderPath = await electron.selectFolder();
    if (folderPath) {
      updateFolder(currentFolderType, { path: folderPath });
      await loadBeatsForFolder(currentFolderType, folderPath);
      showNotification('Folder selected successfully', 'success');
    }
  };

  // Load beats for a folder
  const loadBeatsForFolder = async (type, folderPath) => {
    try {
      if (type === 'tagged' || type === 'untagged') {
        const { folders: subFolders, beats: folderBeats } = await electron.readFolderContents(folderPath);
        const allItems = [...subFolders, ...folderBeats];
        setCurrentBeats(allItems);
      } else {
        const folderBeats = await electron.readBeatsFolder(folderPath);
        setCurrentBeats(folderBeats);
      }
    } catch (error) {
      showNotification('Error loading beats: ' + error.message, 'error');
    }
  };

  // Filter beats
  const filteredBeats = currentBeats.filter(beat => {
    if (!filterValue) return true;
    return beat.name.toLowerCase().includes(filterValue.toLowerCase());
  });

  // Create new pack
  const handleCreatePack = () => {
    const newPack = {
      id: Date.now().toString(),
      name: 'New Pack',
      beats: [],
      thumbnail: null,
    };
    setPacks([...packs, newPack]);
    saveData();
    showNotification('Pack created successfully', 'success');
  };

  return (
    <div className="beats-section">
      {/* Header */}
      <div className="beats-header">
        <h1>Beats Management</h1>
        <button className="btn-primary" onClick={handleCreatePack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Create Pack
        </button>
      </div>

      {/* Folder Type Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${currentFolderType === 'all' ? 'active' : ''}`}
          onClick={() => handleFolderTypeChange('all')}
        >
          Beats
        </button>
        <button
          className={`tab-btn ${currentFolderType === 'untagged' ? 'active' : ''}`}
          onClick={() => handleFolderTypeChange('untagged')}
        >
          Untagged
        </button>
        <button
          className={`tab-btn ${currentFolderType === 'tagged' ? 'active' : ''}`}
          onClick={() => handleFolderTypeChange('tagged')}
        >
          Tagged
        </button>
      </div>

      {/* Folder Selection */}
      <div className="folder-selection">
        <div className="folder-path">
          {folders[currentFolderType].path || 'No folder selected'}
        </div>
        <button className="btn-secondary" onClick={handleSelectFolder}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Select Folder
        </button>
      </div>

      {/* Filter */}
      <div className="beats-filter">
        <input
          type="text"
          className="filter-input"
          placeholder="Filter beats..."
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
        />
      </div>

      {/* Beats List */}
      <div className="beats-list">
        {filteredBeats.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <p>No beats found</p>
            <p className="empty-state-hint">Select a folder to get started</p>
          </div>
        ) : (
          filteredBeats.map((beat) => (
            <div key={beat.path} className="beat-item">
              <div className="beat-icon">
                {beat.type === 'folder' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                )}
              </div>
              <div className="beat-name">{beat.name}</div>
            </div>
          ))
        )}
      </div>

      {/* Packs Section */}
      <div className="packs-section">
        <h2>Packs ({packs.length})</h2>
        <div className="packs-grid">
          {packs.map((pack) => (
            <div key={pack.id} className="pack-card">
              <div className="pack-card-header">
                <h3>{pack.name}</h3>
                <span className="pack-count">{pack.beats?.length || 0} beats</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Beats;
