import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, Download, RotateCcw, Ruler, Search, Grid, Palette, Smartphone } from 'lucide-react'
import html2canvas from 'html2canvas'
import './App.css'
import ARView from './components/ARView'
import { useAR } from './hooks/useAR'

// Import artwork data
import artworkData from '../images.json'

const App = () => {
  const [wallImage, setWallImage] = useState(null)
  const [selectedArtwork, setSelectedArtwork] = useState(null)
  const [calibrationPoints, setCalibrationPoints] = useState([])
  const [realDistance, setRealDistance] = useState('')
  const [artworkSize, setArtworkSize] = useState({ width: 100, height: 100 })
  const [artworkPosition, setArtworkPosition] = useState({ x: 50, y: 50 })
  const [rotation, setRotation] = useState(0)
  const [pixelsPerCm, setPixelsPerCm] = useState(1)
  const [showMeasurement, setShowMeasurement] = useState(true)
  const [currentView, setCurrentView] = useState('home') // home, artists, artworks
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showARView, setShowARView] = useState(false)
  
  const wallCanvasRef = useRef(null)
  const artworkRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  
  const { isARSupported } = useAR()

  // Debug AR support and force enable for testing
  useEffect(() => {
    console.log('AR Support in App:', isARSupported)
    console.log('Selected Artwork:', selectedArtwork)
    console.log('User Agent:', navigator.userAgent)
    console.log('Touch Support:', 'ontouchstart' in window)
  }, [isARSupported, selectedArtwork])

  // For testing - override AR support detection
  const forceARSupport = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 'ontouchstart' in window
  const finalARSupport = isARSupported || forceARSupport

  // Calculate pixels per cm based on calibration
  useEffect(() => {
    if (calibrationPoints.length === 2 && realDistance) {
      const pixelDistance = Math.sqrt(
        Math.pow(calibrationPoints[1].x - calibrationPoints[0].x, 2) +
        Math.pow(calibrationPoints[1].y - calibrationPoints[0].y, 2)
      )
      const ppcm = pixelDistance / parseFloat(realDistance)
      setPixelsPerCm(ppcm)
      
      // Update artwork size based on calibration
      if (selectedArtwork) {
        const artData = findArtworkData(selectedArtwork)
        if (artData) {
          const newWidth = artData.initialSize * ppcm
          const aspectRatio = artworkSize.height / artworkSize.width
          setArtworkSize({ width: newWidth, height: newWidth * aspectRatio })
        }
      }
    }
  }, [calibrationPoints, realDistance, selectedArtwork])

  const findArtworkData = (artworkUrl) => {
    for (const artist of artworkData) {
      const artwork = artist.images.find(img => img.name === artworkUrl)
      if (artwork) return artwork
    }
    return null
  }

  const handleImageUpload = (event, type) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (type === 'wall') {
          setWallImage(e.target.result)
          setCalibrationPoints([])
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleWallClick = useCallback((event) => {
    if (!showMeasurement || calibrationPoints.length >= 2) return
    
    const rect = wallCanvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    setCalibrationPoints(prev => [...prev, { x, y }])
  }, [showMeasurement, calibrationPoints.length])

  const resetCalibration = () => {
    setCalibrationPoints([])
    setRealDistance('')
    setPixelsPerCm(1)
  }

  const selectArtwork = (artwork) => {
    setSelectedArtwork(artwork.name)
    const img = new Image()
    img.onload = () => {
      const aspectRatio = img.height / img.width
      const initialWidth = artwork.initialSize * pixelsPerCm || 100
      setArtworkSize({ 
        width: initialWidth, 
        height: initialWidth * aspectRatio 
      })
    }
    img.src = artwork.name
    setCurrentView('home')
  }

  const openARView = () => {
    if (!selectedArtwork) {
      alert('Please select an artwork first')
      return
    }
    if (!finalARSupport) {
      alert('AR mode requires a device with camera and motion sensors. This works best on mobile phones.')
      return
    }
    setShowARView(true)
  }

  const handleArtworkMouseDown = (event) => {
    setIsDragging(true)
    const rect = wallCanvasRef.current.getBoundingClientRect()
    const artRect = artworkRef.current.getBoundingClientRect()
    setDragOffset({
      x: event.clientX - (artRect.left + artRect.width / 2),
      y: event.clientY - (artRect.top + artRect.height / 2)
    })
  }

  const handleMouseMove = useCallback((event) => {
    if (isDragging) {
      const rect = wallCanvasRef.current.getBoundingClientRect()
      const newX = ((event.clientX - rect.left - dragOffset.x) / rect.width) * 100
      const newY = ((event.clientY - rect.top - dragOffset.y) / rect.height) * 100
      
      setArtworkPosition({
        x: Math.max(0, Math.min(100, newX)),
        y: Math.max(0, Math.min(100, newY))
      })
    }
  }, [isDragging, dragOffset])

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove])

  const downloadImage = async () => {
    const points = document.querySelectorAll('.calibration-point')
    points.forEach(point => point.style.display = 'none')
    
    try {
      const canvas = await html2canvas(wallCanvasRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null
      })
      
      const link = document.createElement('a')
      link.download = 'artwork-preview.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      points.forEach(point => point.style.display = 'block')
    }
  }

  if (currentView === 'artists') {
    return (
      <div className="app">
        <header>
          <h1>Choose an Artist</h1>
          <button onClick={() => setCurrentView('home')}>Back</button>
        </header>
        <div className="artists-grid">
          {artworkData.map(artist => (
            <button
              key={artist.artist}
              className="artist-card"
              onClick={() => {
                setSelectedArtist(artist)
                setCurrentView('artworks')
              }}
            >
              <Palette size={24} />
              <span>{artist.artist}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (currentView === 'artworks' && selectedArtist) {
    return (
      <div className="app">
        <header>
          <h1>{selectedArtist.artist}</h1>
          <button onClick={() => setCurrentView('artists')}>Back</button>
        </header>
        <div className="artworks-grid">
          {selectedArtist.images.map(artwork => (
            <div key={artwork.name} className="artwork-card" onClick={() => selectArtwork(artwork)}>
              <img src={artwork.name} alt={artwork.title} />
              <p>{artwork.title}</p>
              <span>{artwork.initialSize}cm</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show AR view if active
  if (showARView) {
    return (
      <ARView
        selectedArtwork={selectedArtwork}
        artworkData={artworkData}
        onClose={() => setShowARView(false)}
      />
    )
  }

  return (
    <div className="app">
      <header>
        <h1>ArtHang</h1>
        <p>Visualize artwork on your wall at real size</p>
      </header>

      <div className="main-content">
        <div className="wall-container">
          <div 
            ref={wallCanvasRef}
            className="wall-canvas"
            onClick={handleWallClick}
            style={{ 
              backgroundImage: wallImage ? `url(${wallImage})` : 'none',
              cursor: showMeasurement && calibrationPoints.length < 2 ? 'crosshair' : 'default'
            }}
          >
            {/* Calibration points */}
            {showMeasurement && calibrationPoints.map((point, index) => (
              <div
                key={index}
                className="calibration-point"
                style={{ left: point.x, top: point.y }}
              >
                {index + 1}
              </div>
            ))}

            {/* Measurement line */}
            {showMeasurement && calibrationPoints.length === 2 && (
              <svg className="measurement-line">
                <line
                  x1={calibrationPoints[0].x}
                  y1={calibrationPoints[0].y}
                  x2={calibrationPoints[1].x}
                  y2={calibrationPoints[1].y}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              </svg>
            )}

            {/* Artwork */}
            {selectedArtwork && (
              <div
                ref={artworkRef}
                className="artwork"
                style={{
                  left: `${artworkPosition.x}%`,
                  top: `${artworkPosition.y}%`,
                  width: artworkSize.width,
                  height: artworkSize.height,
                  transform: `translate(-50%, -50%) perspective(500px) rotateY(${rotation}deg)`,
                  backgroundImage: `url(${selectedArtwork})`,
                  cursor: 'move'
                }}
                onMouseDown={handleArtworkMouseDown}
              />
            )}

            {!wallImage && (
              <div className="empty-wall">
                <Camera size={48} />
                <p>Upload a photo of your wall to get started</p>
              </div>
            )}
          </div>
        </div>

        <div className="controls">
          <div className="control-group">
            <h3>Step 1: Add Wall Photo</h3>
            <div className="button-group">
              <button onClick={() => cameraInputRef.current?.click()}>
                <Camera size={16} />
                Take Photo
              </button>
              <button onClick={() => fileInputRef.current?.click()}>
                <Upload size={16} />
                Upload Photo
              </button>
            </div>
          </div>

          {wallImage && (
            <div className="control-group">
              <h3>Step 2: Calibrate Scale</h3>
              <p>Click two points on a known distance (like a light switch - usually 8.5cm wide)</p>
              <div className="calibration-controls">
                <input
                  type="number"
                  placeholder="Distance in cm"
                  value={realDistance}
                  onChange={(e) => setRealDistance(e.target.value)}
                  disabled={calibrationPoints.length < 2}
                />
                <button onClick={resetCalibration}>
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button 
                  onClick={() => setShowMeasurement(!showMeasurement)}
                  className={showMeasurement ? 'active' : ''}
                >
                  <Ruler size={16} />
                  {showMeasurement ? 'Hide' : 'Show'} Measurement
                </button>
              </div>
              {calibrationPoints.length === 2 && realDistance && (
                <p className="scale-info">
                  Scale: {pixelsPerCm.toFixed(2)} pixels per cm
                </p>
              )}
            </div>
          )}

          <div className="control-group">
            <h3>Step 3: Choose Artwork</h3>
            <div className="button-group">
              <button onClick={() => setCurrentView('artists')}>
                <Search size={16} />
                Browse Artists
              </button>
              {selectedArtwork && (
                <button 
                  onClick={openARView} 
                  className="ar-mode-btn"
                  disabled={!finalARSupport}
                  title={!finalARSupport ? 'AR requires camera and motion sensors' : 'Open AR Mode'}
                >
                  <Smartphone size={16} />
                  AR Mode {!finalARSupport && '(Unsupported)'}
                </button>
              )}
            </div>
            {selectedArtwork && (
              <div className="artwork-info">
                <img src={selectedArtwork} alt="Selected artwork" className="artwork-preview" />
                <p>Selected artwork loaded</p>
                {finalARSupport && (
                  <p className="ar-hint">💡 Try AR Mode for live preview!</p>
                )}
              </div>
            )}
          </div>

          {selectedArtwork && (
            <div className="control-group">
              <h3>Step 4: Adjust Artwork</h3>
              <div className="adjustment-controls">
                <label>
                  Rotation: {rotation}°
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                  />
                </label>
                <label>
                  Size: {artworkSize.width.toFixed(0)}px
                  <input
                    type="range"
                    min="50"
                    max="500"
                    value={artworkSize.width}
                    onChange={(e) => {
                      const newWidth = parseInt(e.target.value)
                      const aspectRatio = artworkSize.height / artworkSize.width
                      setArtworkSize({ width: newWidth, height: newWidth * aspectRatio })
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {wallImage && selectedArtwork && (
            <div className="control-group">
              <h3>Step 5: Save Result</h3>
              <button onClick={downloadImage} className="download-btn">
                <Download size={16} />
                Download Preview
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleImageUpload(e, 'wall')}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleImageUpload(e, 'wall')}
      />
    </div>
  )
}

export default App