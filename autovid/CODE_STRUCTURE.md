# 🏗️ Code Structure Documentation

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                     Electron App                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │ Main Process │◄────►│   Preload    │               │
│  │  (main.js)   │      │ (preload.js) │               │
│  └──────┬───────┘      └──────┬───────┘               │
│         │                     │                        │
│         │                     │                        │
│         ▼                     ▼                        │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Modules    │      │  Renderer    │               │
│  │ ├─pinterest  │      │(renderer.js) │               │
│  │ └─render     │      │              │               │
│  └──────────────┘      └──────┬───────┘               │
│         │                     │                        │
│         │                     ▼                        │
│         │              ┌──────────────┐               │
│         │              │  UI (HTML)   │               │
│         │              │  (index.html)│               │
│         │              └──────────────┘               │
│         │                                              │
│         ▼                                              │
│  ┌──────────────┐                                     │
│  │   External   │                                     │
│  │ ├─Pinterest  │                                     │
│  │ │  API       │                                     │
│  │ └─FFmpeg     │                                     │
│  └──────────────┘                                     │
└─────────────────────────────────────────────────────────┘
```

## Chi tiết từng file

### 1. `src/main.js` - Main Process

**Vai trò:** Quản lý app lifecycle, tạo window, xử lý IPC

**Chức năng chính:**
- Khởi tạo BrowserWindow
- Load environment variables (.env)
- Khởi tạo Pinterest API client
- Khởi tạo Video Renderer
- Xử lý IPC handlers (validate-token, get-boards, search-pins, etc.)
- File dialogs (chọn audio)
- Shell commands (mở folder)

**Dependencies:**
- `electron` - Framework chính
- `dotenv` - Load .env variables
- `./modules/pinterest` - Pinterest API module
- `./modules/render` - Video rendering module

**IPC Handlers:**
```javascript
ipcMain.handle('validate-token')      // Validate Pinterest token
ipcMain.handle('get-boards')          // Lấy danh sách boards
ipcMain.handle('search-pins')         // Tìm kiếm pins
ipcMain.handle('get-random-pin')      // Random pin
ipcMain.handle('download-image')      // Download ảnh
ipcMain.handle('select-audio-file')   // Dialog chọn audio
ipcMain.handle('render-video')        // Render video
ipcMain.handle('open-output-folder')  // Mở folder output
ipcMain.handle('get-system-info')     // System info
```

---

### 2. `src/preload.js` - Preload Script

**Vai trò:** Security bridge giữa Main và Renderer process

**Chức năng:**
- Expose safe APIs qua `contextBridge`
- Không cho phép renderer access trực tiếp Node.js APIs
- Provide IPC communication methods

**Exposed APIs:**
```javascript
window.electronAPI = {
  validateToken()          // → Promise
  getBoards()             // → Promise
  searchPins(keyword)     // → Promise
  getRandomPin()          // → Promise
  downloadImage(url)      // → Promise
  selectAudioFile()       // → Promise
  renderVideo(data)       // → Promise
  openOutputFolder()      // → Promise
  onRenderProgress(cb)    // Event listener
  getSystemInfo()         // → Promise
}
```

---

### 3. `src/renderer.js` - Renderer Process

**Vai trò:** UI logic, event handling, state management

**State Management:**
```javascript
appState = {
  boards: [],              // Danh sách boards
  currentPins: [],         // Pins tìm được
  selectedImage: null,     // Ảnh đang chọn
  selectedImagePath: null, // Path ảnh đã download
  selectedAudioPath: null, // Path audio
  isRendering: false       // Trạng thái render
}
```

**Main Functions:**
```javascript
loadBoards()          // Load Pinterest boards
searchPins()          // Tìm kiếm pins
selectRandomPin()     // Chọn pin ngẫu nhiên
selectAudioFile()     // Chọn file audio
renderVideo()         // Render video
openOutputFolder()    // Mở folder output
initializeApp()       // Khởi tạo app
```

**Event Listeners:**
- Button clicks
- Input key presses (Enter)
- Progress updates từ main process

---

### 4. `src/modules/pinterest.js` - Pinterest API Module

**Vai trò:** Xử lý tất cả tương tác với Pinterest API v5

**Class: `PinterestAPI`**

**Constructor:**
```javascript
new PinterestAPI(accessToken)
// Khởi tạo axios instance với auth header
```

**Public Methods:**
```javascript
async getBoards()
// → Array<{id, name, description, pin_count, privacy}>

async searchPinsInBoard(boardId, keyword)
// → Array<{id, title, description, imageUrl, link}>

async searchPinsInAllBoards(keyword)
// → Array<Pin> (combined from all boards)

getRandomPin(pins)
// → Pin (random selection)

async downloadImage(imageUrl, savePath)
// → string (path to saved image)

async validateToken()
// → boolean (true if valid)
```

**API Endpoints Used:**
- `GET /boards` - Lấy danh sách boards
- `GET /boards/{id}/pins` - Lấy pins trong board
- `GET /user_account` - Validate token

**Features:**
- Automatic retry logic
- Error handling
- Console logging
- Parallel API calls (Promise.all)
- Keyword filtering (client-side)

---

### 5. `src/modules/render.js` - Video Rendering Module

**Vai trò:** Xử lý FFmpeg rendering, crop ảnh, tạo video

**Class: `VideoRenderer`**

**Constructor:**
```javascript
new VideoRenderer()
// Tạo output directory nếu chưa có
// Set FFmpeg path
```

**Public Methods:**
```javascript
async cropImageToSquare(inputImage, outputImage)
// Crop ảnh thành 1:1 (1080x1080)
// → string (path to cropped image)

async renderVideo(imagePath, audioPath, outputName, progressCallback)
// Render video từ ảnh + audio
// → string (path to rendered video)

async createVideo(imagePath, audioPath, outputName, progressCallback)
// Full pipeline: crop + render + cleanup
// → string (path to final video)

async validateAudioFile(audioPath)
// Kiểm tra file audio hợp lệ
// → boolean

getOutputDirectory()
// → string (path to output folder)
```

**FFmpeg Parameters:**
```javascript
Video:
- Codec: libx264 (H.264)
- CRF: 18 (high quality)
- Preset: slow (better compression)
- Pixel format: yuv420p
- Size: 1080x1080
- Filter: scale + crop (center)

Audio:
- Codec: aac
- Bitrate: 320k
- Sample rate: 48000Hz
```

**Progress Tracking:**
- Progress callback được gọi mỗi khi FFmpeg update %
- Range: 0-100

---

### 6. `src/ui/index.html` - Main UI

**Cấu trúc Layout:**
```
┌─────────────────────────────────────────┐
│            Header (Title)               │
├──────────┬──────────────┬───────────────┤
│          │              │               │
│ Left     │   Center     │    Right      │
│ Panel    │   Panel      │    Panel      │
│          │              │               │
│ Boards   │   Image      │  Audio +      │
│ List     │   Preview    │  Render       │
│          │              │               │
├──────────┴──────────────┴───────────────┤
│           Status Bar                    │
└─────────────────────────────────────────┘
```

**Sections:**
1. **Left Panel:**
   - Load Boards button
   - Keyword search input
   - Boards list (scrollable)

2. **Center Panel:**
   - Randomize button
   - Image preview
   - Image info (title, description)

3. **Right Panel:**
   - Select audio button
   - Audio player
   - Output name input
   - Render button
   - Progress bar
   - Success section (open folder)

4. **Status Bar:**
   - Real-time status messages

---

### 7. `src/ui/styles.css` - Styling

**Design System:**
```css
Colors:
- Primary: #667eea (blue-purple)
- Secondary: #764ba2 (purple)
- Success: #51cf66 (green)
- Background: gradient (667eea → 764ba2)
- Text: #333 (dark gray)

Typography:
- Font: Segoe UI
- Header: 28px
- Title: 18px
- Body: 14px

Layout:
- Flexbox-based
- Responsive panels
- Scrollable sections
```

**Components:**
- Buttons (primary, secondary, success)
- Inputs (text, search)
- Lists (boards)
- Cards (board items)
- Progress bars
- Status indicators

**Animations:**
- Hover effects (transform, shadow)
- Loading spinner (rotation)
- Smooth transitions (0.3s)

---

## Data Flow

### 1. Load Boards Flow

```
User clicks "Tải Boards"
    ↓
renderer.js: loadBoards()
    ↓
IPC → main.js: handle('get-boards')
    ↓
pinterest.js: getBoards()
    ↓
Pinterest API: GET /boards
    ↓
Response → main.js
    ↓
IPC → renderer.js
    ↓
Update UI: renderBoardsList()
```

### 2. Search & Randomize Flow

```
User enters keyword + clicks Search
    ↓
renderer.js: searchPins()
    ↓
IPC → main.js: handle('search-pins')
    ↓
pinterest.js: searchPinsInAllBoards()
    ↓
Pinterest API: GET /boards/{id}/pins (parallel)
    ↓
Filter by keyword (client-side)
    ↓
Store in currentPins array
    ↓
IPC → renderer.js
    ↓
renderer.js: selectRandomPin()
    ↓
IPC → main.js: handle('get-random-pin')
    ↓
Get random from currentPins
    ↓
IPC → main.js: handle('download-image')
    ↓
pinterest.js: downloadImage()
    ↓
Save to temp folder
    ↓
Update UI with preview
```

### 3. Render Video Flow

```
User clicks "Render Video"
    ↓
renderer.js: renderVideo()
    ↓
IPC → main.js: handle('render-video')
    ↓
render.js: createVideo()
    ↓
Step 1: cropImageToSquare()
    ↓
FFmpeg: crop to 1:1
    ↓
Step 2: renderVideo()
    ↓
FFmpeg: combine image + audio
    ↓
Progress callbacks → IPC
    ↓
renderer.js: update progress bar
    ↓
Cleanup: delete temp cropped image
    ↓
Save to output/
    ↓
IPC → renderer.js
    ↓
Show success message
```

---

## Error Handling

### Levels của Error Handling:

1. **Module Level:**
   - Try-catch trong mỗi async function
   - Console.error logging
   - Throw error với message rõ ràng

2. **IPC Handler Level:**
   - Catch errors từ modules
   - Return `{success: false, error: message}`
   - Log errors to console

3. **Renderer Level:**
   - Check `result.success`
   - Show user-friendly alerts
   - Update status bar với error message
   - Reset UI state

### Error Types:

**Pinterest API Errors:**
- Invalid token
- Rate limit exceeded
- Network errors
- No boards/pins found

**File System Errors:**
- Cannot download image
- Cannot read audio file
- Insufficient disk space

**FFmpeg Errors:**
- Invalid image format
- Invalid audio format
- Render failed
- Out of memory

---

## Security Considerations

### 1. Context Isolation
- `contextIsolation: true` trong BrowserWindow
- Renderer không có direct access to Node.js
- All communication qua IPC

### 2. Node Integration
- `nodeIntegration: false`
- Prevent XSS attacks
- Safe API exposure via preload

### 3. Environment Variables
- `.env` trong `.gitignore`
- Never commit sensitive data
- Use `.env.example` template

### 4. File Access
- Validate file paths
- Sanitize user inputs
- Use dialog for file selection (không cho user input path)

---

## Performance Optimizations

### 1. Pinterest API
- Parallel API calls (Promise.all)
- Client-side filtering (reduce API calls)
- Cache pins in memory (currentPins)

### 2. Image Handling
- Download once, randomize many times
- Temporary file cleanup
- Efficient cropping (FFmpeg)

### 3. Video Rendering
- Progress callbacks (responsive UI)
- Background processing (không block UI)
- Optimal FFmpeg settings (slow preset for quality)

### 4. UI
- CSS transitions (GPU accelerated)
- Debounced inputs (nếu cần)
- Lazy loading (scrollable lists)

---

## Testing Checklist

### Manual Testing:

- [ ] Load boards successfully
- [ ] Search with valid keyword
- [ ] Search with invalid keyword
- [ ] Randomize image multiple times
- [ ] Select audio file (MP3, WAV)
- [ ] Render video with valid inputs
- [ ] Render with missing image
- [ ] Render with missing audio
- [ ] Open output folder
- [ ] Invalid Pinterest token
- [ ] Network offline
- [ ] Progress bar updates correctly

### Edge Cases:

- [ ] Empty boards (no pins)
- [ ] Very large images (>10MB)
- [ ] Very long audio files (>10 minutes)
- [ ] Special characters in output name
- [ ] Disk space full
- [ ] FFmpeg crashes

---

## Future Enhancements

### Potential Features:

1. **Batch Processing:**
   - Render multiple videos in queue
   - Different images for each video

2. **Video Effects:**
   - Ken Burns effect (zoom in/out)
   - Fade transitions
   - Filters (sepia, black & white)

3. **Audio Processing:**
   - Trim audio to specific duration
   - Fade in/out
   - Normalize volume

4. **YouTube Integration:**
   - Direct upload to YouTube
   - Auto-generate description
   - Add tags

5. **Templates:**
   - Save favorite settings
   - Preset configurations
   - Batch apply settings

6. **Advanced Search:**
   - Filter by board
   - Color search
   - Aspect ratio filter

---

**Maintained by:** Project Team
**Last Updated:** 2025-10-10
**Version:** 1.0.0
