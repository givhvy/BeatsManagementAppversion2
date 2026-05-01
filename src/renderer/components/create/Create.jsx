import React, { useState, useRef } from 'react';
import { useAppStore } from '../../shared/store';
import { electron } from '../../shared/electron';
import { showNotification } from '../../shared/notifications';
import './Create.css';

function Create() {
  const {
    selectedImage,
    selectedImagePath,
    selectedAudioPath,
    isRendering,
    setSelectedImage,
    setSelectedImagePath,
    setSelectedAudioPath,
    setIsRendering,
    setLastOutputPath,
    resetWorkspace,
  } = useAppStore();

  const [outputName, setOutputName] = useState('video_output');
  const [resolution, setResolution] = useState('1920x1080');
  const [renderProgress, setRenderProgress] = useState(0);
  const [showOutput, setShowOutput] = useState(false);
  const [renderedVideoPath, setRenderedVideoPath] = useState(null);

  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // Handle image selection
  const handleSelectImage = async () => {
    const imagePath = await electron.selectImage();
    if (imagePath) {
      setSelectedImagePath(imagePath);
      setSelectedImage(null);
      showNotification('Image selected', 'success');
    }
  };

  // Handle audio selection
  const handleSelectAudio = async () => {
    const audioPath = await electron.selectAudioFile();
    if (audioPath) {
      setSelectedAudioPath(audioPath);
      // Extract filename for output name
      const fileName = audioPath.split('\\').pop().replace(/\.[^/.]+$/, '');
      setOutputName(fileName);
      showNotification('Audio selected', 'success');
    }
  };

  // Handle image drop
  const handleImageDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const path = file.path;
      setSelectedImagePath(path);
      setSelectedImage(null);
    }
  };

  // Handle audio drop
  const handleAudioDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      const path = file.path;
      setSelectedAudioPath(path);
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setOutputName(fileName);
    }
  };

  // Render video
  const handleRenderVideo = async () => {
    if (!selectedImagePath && !selectedImage) {
      showNotification('Please select an image first', 'error');
      return;
    }
    if (!selectedAudioPath) {
      showNotification('Please select an audio file first', 'error');
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    setShowOutput(false);

    try {
      // Setup progress listener
      const cleanup = electron.onRenderProgress((progress) => {
        setRenderProgress(progress);
      });

      let imagePath = selectedImagePath;

      // Download image if it's from Pinterest
      if (!imagePath && selectedImage?.imageUrl) {
        const tempDir = await electron.getVideoOutputDir();
        const tempImagePath = `${tempDir}\\temp_image_${Date.now()}.jpg`;
        const downloadResult = await electron.downloadImage(selectedImage.imageUrl, tempImagePath);
        if (downloadResult.success) {
          imagePath = downloadResult.path;
        } else {
          throw new Error('Failed to download image');
        }
      }

      const result = await electron.renderVideo({
        imagePath,
        audioPath: selectedAudioPath,
        outputName: outputName || `video_${Date.now()}`,
        resolution,
      });

      cleanup();

      if (result.success) {
        setLastOutputPath(result.outputPath);
        setRenderedVideoPath(result.outputPath);
        setShowOutput(true);
        showNotification('Video rendered successfully!', 'success');
      } else {
        showNotification(`Render error: ${result.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Render error: ${error.message}`, 'error');
    } finally {
      setIsRendering(false);
    }
  };

  // Open output folder
  const handleOpenOutputFolder = async () => {
    const outputDir = await electron.getVideoOutputDir();
    await electron.openFolder(outputDir);
  };

  // Reset workspace
  const handleReset = () => {
    resetWorkspace();
    setOutputName('video_output');
    setRenderProgress(0);
    setShowOutput(false);
    setRenderedVideoPath(null);
    showNotification('Workspace reset', 'success');
  };

  const canRender = (selectedImagePath || selectedImage) && selectedAudioPath && !isRendering;

  return (
    <div className="create-section">
      <div className="create-container">
        {/* Left Panel - Image */}
        <div className="create-panel">
          <div className="panel-header">
            <h2>Image Preview</h2>
            <button className="reset-btn" onClick={handleReset} title="Reset workspace">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </button>
          </div>

          <div
            className="image-drop-zone"
            onClick={handleSelectImage}
            onDrop={handleImageDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {selectedImagePath ? (
              <img src={`file://${selectedImagePath}`} alt="Selected" className="preview-image" />
            ) : (
              <div className="drop-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p>Drop image here</p>
                <p className="drop-hint">or click to browse</p>
              </div>
            )}
          </div>

          <button className="btn-secondary" onClick={handleSelectImage}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Browse Image
          </button>
        </div>

        {/* Right Panel - Audio & Render */}
        <div className="create-panel">
          <div className="panel-header">
            <h2>Audio & Render</h2>
          </div>

          {/* Audio Selection */}
          <div className="field-group">
            <label className="field-label">Audio File</label>
            <div
              className="audio-drop-zone"
              onClick={handleSelectAudio}
              onDrop={handleAudioDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              {selectedAudioPath ? (
                <div className="audio-selected">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                  <span>{selectedAudioPath.split('\\').pop()}</span>
                </div>
              ) : (
                <div className="drop-placeholder-small">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                  <span>Drop audio or click to browse</span>
                </div>
              )}
            </div>
          </div>

          {/* Output Name */}
          <div className="field-group">
            <label className="field-label">Output Name</label>
            <input
              type="text"
              className="field-input"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="video_output"
            />
          </div>

          {/* Resolution */}
          <div className="field-group">
            <label className="field-label">Resolution</label>
            <select
              className="field-input"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              <option value="1920x1080">1920×1080 (16:9)</option>
              <option value="1080">1080×1080 (1:1)</option>
              <option value="720">1280×720 (16:9)</option>
            </select>
          </div>

          {/* Render Button */}
          <button
            className="btn-render"
            onClick={handleRenderVideo}
            disabled={!canRender}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2"/>
            </svg>
            {isRendering ? 'Rendering...' : 'Render Video'}
          </button>

          {/* Progress Bar */}
          {isRendering && (
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${renderProgress}%` }} />
              </div>
              <span className="progress-text">{renderProgress}%</span>
            </div>
          )}

          {/* Output */}
          {showOutput && (
            <div className="output-container">
              <div className="success-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Video rendered successfully!</span>
              </div>
              <button className="btn-secondary" onClick={handleOpenOutputFolder}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                Open Folder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Create;
