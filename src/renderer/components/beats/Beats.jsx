import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../shared/store';
import { electron } from '../../shared/electron';
import { showNotification } from '../../shared/notifications';
import AudioPlayer from '../AudioPlayer';
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
  const [playingBeat, setPlayingBeat] = useState(null);

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

  // Drag and drop state
  const [draggedBeat, setDraggedBeat] = useState(null);

  // Handle beat drag start
  const handleBeatDragStart = (beat, e) => {
    setDraggedBeat(beat);
    e.dataTransfer.effectAllowed = 'copy';
    
    // For external drag (to desktop/other apps)
    if (electron.isElectron && beat.path) {
      e.preventDefault();
      const beatName = beat.name.replace(/\.(mp3|wav|flac|m4a|aac|ogg)$/i, '');
      electron.startDrag([beat.path], beatName);
    }
  };

  // Handle beat drag end
  const handleBeatDragEnd = () => {
    setDraggedBeat(null);
  };

  // Handle pack drop
  const handlePackDrop = (packId, e) => {
    e.preventDefault();
    if (!draggedBeat) return;

    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    // Check if beat already in pack
    if (pack.beats.some(b => b.path === draggedBeat.path)) {
      showNotification('Beat already in pack', 'info');
      return;
    }

    // Add beat to pack
    const updatedPacks = packs.map(p => {
      if (p.id === packId) {
        return {
          ...p,
          beats: [...p.beats, draggedBeat]
        };
      }
      return p;
    });

    setPacks(updatedPacks);
    saveData();
    showNotification(`Added "${draggedBeat.name}" to pack`, 'success');
  };

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

  // Delete pack
  const handleDeletePack = (packId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this pack?')) {
      const updatedPacks = packs.filter(p => p.id !== packId);
      setPacks(updatedPacks);
      saveData();
      showNotification('Pack deleted', 'success');
    }
  };

  // Rename pack
  const handleRenamePack = (packId, e) => {
    e.stopPropagation();
    const pack = packs.find(p => p.id === packId);
    if (!pack) return;

    const newName = prompt('Enter new pack name:', pack.name);
    if (newName && newName.trim()) {
      const updatedPacks = packs.map(p => {
        if (p.id === packId) {
          return { ...p, name: newName.trim() };
        }
        return p;
      });
      setPacks(updatedPacks);
      saveData();
      showNotification('Pack renamed', 'success');
    }
  };

  // Handle beat click to play
  const handleBeatClick = (beat) => {
    if (beat.type === 'folder') return;
    setPlayingBeat(beat);
  };

  return (
    <div className="beats-section">
      {/* Audio Player */}
      {playingBeat && (
        <div className="audio-player-container">
          <div className="audio-player-header">
            <span className="audio-player-title">{playingBeat.name}</span>
          </div>
          <AudioPlayer
            audioPath={playingBeat.path}
            onClose={() => setPlayingBeat(null)}
          />
        </div>
      )}

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
            <div
              key={beat.path}
              className="beat-item"
              draggable
              onDragStart={(e) => handleBeatDragStart(beat, e)}
              onDragEnd={handleBeatDragEnd}
              onClick={() => handleBeatClick(beat)}
            >
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
            <div
              key={pack.id}
              className="pack-card"
              onDrop={(e) => handlePackDrop(pack.id, e)}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="pack-card-header">
                <h3>{pack.name}</h3>
                <div className="pack-actions">
                  <button
                    className="pack-action-btn"
                    onClick={(e) => handleRenamePack(pack.id, e)}
                    title="Rename"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className="pack-action-btn delete"
                    onClick={(e) => handleDeletePack(pack.id, e)}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div className="pack-count">{pack.beats?.length || 0} beats</div>
              <div className="pack-drop-hint">Drop beats here</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Beats;
