import React, { useRef, useState, useEffect } from 'react';
import { createTextElement, getSVGCoordinates } from '../lib/svg';
import { saveTemplateConfig } from '../lib/api';
import styles from './SVGEditor.module.css';

export default function SVGEditor({ svgUrl, onPositionSelect, templateId: propTemplateId, templateType = 'svg', templateDimensions, eventId: propEventId, initialConfig = {} }) {
  const svgRef = useRef(null);
  const svgElementRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  
  const [position, setPosition] = useState(initialConfig.position || { x: 0, y: 0, width: 150, height: 60 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [svgContent, setSvgContent] = useState('');
  const [fontColor, setFontColor] = useState(initialConfig.fontColor || '#000000');
  const [isBold, setIsBold] = useState(initialConfig.fontWeight === 'bold');
  const [isItalic, setIsItalic] = useState(initialConfig.fontStyle === 'italic');
  const [fontFamily, setFontFamily] = useState(initialConfig.fontFamily || 'Arial');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    if (!svgUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    console.log(`Loading template: templateType=${templateType}, svgUrl=${svgUrl}`);

    if (templateType === 'image') {
      const w = templateDimensions?.width || 800;
      const h = templateDimensions?.height || 600;
      const svgImage = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">
        <image href="${svgUrl}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" />
      </svg>`;
      setSvgContent(svgImage);
      setLoading(false);
    } else {
      fetch(svgUrl)
        .then((res) => {
          console.log(`SVG fetch response: ${res.status} ${res.statusText}`);
          if (!res.ok) throw new Error(`Failed to load SVG: ${res.statusText}`);
          return res.text();
        })
        .then((svgText) => {
          console.log(`SVG text received, length: ${svgText.length}`);
          if (svgText.includes('<svg')) {
            setSvgContent(svgText);
            setLoading(false);
          } else {
            throw new Error('File loaded is not a valid SVG');
          }
        })
        .catch((err) => {
          console.error('SVG Load Error:', err);
          setError(err.message || 'Failed to load SVG');
          setLoading(false);
        });
    }
  }, [svgUrl, templateType, templateDimensions]);

  // When svgContent is set and the container renders, inject the HTML
  useEffect(() => {
    if (svgRef.current && svgContent) {
      svgRef.current.innerHTML = svgContent;
      svgElementRef.current = svgRef.current.querySelector('svg');
    }
  }, [svgContent, loading]);

  // Load initial configuration when it changes (switching between templates)
  useEffect(() => {
    if (Object.keys(initialConfig).length > 0) {
      if (initialConfig.position) {
        setPosition(initialConfig.position);
      }
      if (initialConfig.fontColor) {
        setFontColor(initialConfig.fontColor);
      }
      if (initialConfig.fontStyle) {
        setIsItalic(initialConfig.fontStyle === 'italic');
      }
      if (initialConfig.fontWeight) {
        setIsBold(initialConfig.fontWeight === 'bold');
      }
      if (initialConfig.fontFamily) {
        setFontFamily(initialConfig.fontFamily);
      }
    }
  }, [initialConfig]);

  // Update preview text on the SVG when previewText or position changes
  useEffect(() => {
    if (!svgElementRef.current || !position || !previewText) return;

    const svg = svgElementRef.current;
    const existingText = svg.querySelector('#preview-name');
    if (existingText) existingText.remove();

    // Center text in the selected area
    const centerX = position.x + (position.width || 0) / 2;
    const centerY = position.y + (position.height || 0) / 2;

    // Auto-scale font size to fit inside the bounding box
    const boxWidth = position.width || 150;
    const boxHeight = position.height || 60;
    const padding = 3; // Small padding to prevent text from touching edges

    // Function to measure text and calculate best fit
    const calculateFitFontSize = () => {
      let bestFitSize = 8; // Minimum readable size

      // Create a temporary text element to measure dimensions
      const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tempText.textContent = previewText;
      tempText.style.fontFamily = fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
      tempText.style.fontWeight = isBold ? 'bold' : 'normal';
      tempText.style.fontStyle = isItalic ? 'italic' : 'normal';
      tempText.style.visibility = 'hidden';
      tempText.style.position = 'absolute';
      tempText.setAttribute('text-anchor', 'middle');
      tempText.setAttribute('dominant-baseline', 'middle');
      svg.appendChild(tempText);

      // Binary search for the best fit size - start with larger max size
      let minSize = 8;
      let maxSize = 120; // Start with larger max to find optimal size
      let iterations = 0;
      const maxIterations = 12;

      while (iterations < maxIterations && minSize <= maxSize) {
        const midSize = Math.round((minSize + maxSize) / 2);
        tempText.style.fontSize = `${midSize}px`;

        // Get the actual dimensions of the text
        const bbox = tempText.getBBox();
        const textWidth = bbox.width + padding * 2;
        const textHeight = bbox.height + padding * 2;

        // Check if text fits in the box
        if (textWidth <= boxWidth && textHeight <= boxHeight) {
          bestFitSize = midSize;
          minSize = midSize + 1;
        } else {
          maxSize = midSize - 1;
        }

        iterations++;
      }

      svg.removeChild(tempText);
      return bestFitSize;
    };

    const dynamicFontSize = calculateFitFontSize();

    // Create the actual text element with the calculated size
    const previewTextElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    previewTextElement.id = 'preview-name';
    previewTextElement.setAttribute('x', centerX);
    previewTextElement.setAttribute('y', centerY);
    previewTextElement.setAttribute('fill', fontColor);
    previewTextElement.setAttribute('text-anchor', 'middle');
    previewTextElement.setAttribute('dominant-baseline', 'middle');
    previewTextElement.textContent = previewText;
    
    // Apply dynamic styling
    previewTextElement.style.fontFamily = fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
    previewTextElement.style.fontSize = `${dynamicFontSize}px`;
    previewTextElement.style.fontWeight = isBold ? 'bold' : 'normal';
    previewTextElement.style.fontStyle = isItalic ? 'italic' : 'normal';
    previewTextElement.style.fill = fontColor;
    previewTextElement.style.pointerEvents = 'none';

    svg.appendChild(previewTextElement);
  }, [previewText, position, isBold, isItalic, fontFamily, fontColor]);

  const drawStartRef = useRef(null);

  const handleMouseDown = (e) => {
    if (!svgElementRef.current) return;

    const svg = svgElementRef.current;
    const coords = getSVGCoordinates(svg, e);
    if (!coords) return;
    
    // Check if clicked inside existing box
    if (
      position && 
      coords.x >= position.x && coords.x <= position.x + position.width &&
      coords.y >= position.y && coords.y <= position.y + position.height
    ) {
      // Start dragging
      isDraggingRef.current = true;
      dragOffsetRef.current = {
        x: coords.x - position.x,
        y: coords.y - position.y,
      };
    } else {
      // Start drawing new box
      isDraggingRef.current = false;
      drawStartRef.current = coords;
      setPosition({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  };

  const handleMouseMove = (e) => {
    if (!svgElementRef.current) return;
    if (!isDraggingRef.current && !drawStartRef.current) return;

    const svg = svgElementRef.current;
    const coords = getSVGCoordinates(svg, e);
    if (!coords) return;

    if (isDraggingRef.current) {
      // Drag existing box
      setPosition(prev => ({
        ...prev,
        x: Math.round(Math.max(0, coords.x - dragOffsetRef.current.x)),
        y: Math.round(Math.max(0, coords.y - dragOffsetRef.current.y)),
      }));
    } else if (drawStartRef.current) {
      // Draw new box
      const start = drawStartRef.current;
      setPosition({
        x: Math.round(Math.min(start.x, coords.x)),
        y: Math.round(Math.min(start.y, coords.y)),
        width: Math.round(Math.abs(coords.x - start.x)),
        height: Math.round(Math.abs(coords.y - start.y)),
      });
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current || drawStartRef.current) {
      isDraggingRef.current = false;
      drawStartRef.current = null;
      
      // Guarantee a minimum size if they just clicked without dragging
      setPosition(prev => {
        const finalPos = {
          ...prev,
          width: prev.width < 20 ? 150 : prev.width,
          height: prev.height < 20 ? 60 : prev.height
        };
        // Use a slight timeout to decouple from React's immediate render cycle warning
        setTimeout(() => {
          onPositionSelect(finalPos);
        }, 0);
        return finalPos;
      });
    }
  };

  const drawBoundingBox = (pos) => {
    const svg = svgElementRef.current;
    if (!svg) return;

    // Remove existing bounding box
    const existingBox = svg.querySelector('#selection-box');
    if (existingBox) existingBox.remove();

    // Create rectangle for bounding box
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.id = 'selection-box';
    rect.setAttribute('x', pos.x);
    rect.setAttribute('y', pos.y);
    rect.setAttribute('width', pos.width);
    rect.setAttribute('height', pos.height);
    rect.setAttribute('fill', 'rgba(139, 92, 246, 0.1)'); // Lighter purple
    rect.setAttribute('stroke', '#8b5cf6'); // Purple
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('stroke-dasharray', '8,4'); // Dashed pattern
    rect.setAttribute('pointer-events', 'none');

    svg.appendChild(rect);
  };

  // Update bounding box when position changes
  useEffect(() => {
    if (position) {
      drawBoundingBox(position);
    }
  }, [position]);

  const handleClear = (e) => {
    e.stopPropagation();
    setPosition({ x: 0, y: 0, width: 150, height: 60 });
    setPreviewText('');
    setFontColor('#000000');
    setIsBold(true);
    setIsItalic(false);
    setSaveSuccess('');
    isDraggingRef.current = false;
    onPositionSelect(null);
    
    if (svgElementRef.current) {
      const svg = svgElementRef.current;
      const existingText = svg.querySelector('#preview-name');
      if (existingText) existingText.remove();
      const existingBox = svg.querySelector('#selection-box');
      if (existingBox) existingBox.remove();
    }
  };

  const handlePositionXChange = (e) => {
    const x = parseInt(e.target.value) || 0;
    setPosition(prev => ({ ...prev, x }));
  };

  const handlePositionYChange = (e) => {
    const y = parseInt(e.target.value) || 0;
    setPosition(prev => ({ ...prev, y }));
  };

  const handlePositionWidthChange = (e) => {
    const width = parseInt(e.target.value) || 0;
    setPosition(prev => ({ ...prev, width }));
  };

  const handlePositionHeightChange = (e) => {
    const height = parseInt(e.target.value) || 0;
    setPosition(prev => ({ ...prev, height }));
  };

  const handleSaveConfig = async () => {
    if (!position) {
      setSaveError('Please select an area first');
      return;
    }

    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      // Get templateId from props or localStorage
      const templateId = propTemplateId || localStorage.getItem('currentTemplateId');
      const eventId = propEventId || localStorage.getItem('currentEventId');
      
      if (!templateId || !eventId) {
        throw new Error('Missing template ID or event ID');
      }

      const config = {
        position,
        fontColor,
        fontStyle: isItalic ? 'italic' : 'normal',
        fontWeight: isBold ? 'bold' : 'normal',
        fontFamily: fontFamily,
      };

      await saveTemplateConfig(eventId, templateId, config);
      setSaveSuccess('✓ Configuration saved to Firebase!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading SVG...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.instructions}>
        <div className={styles.headerWrapper}>
          <div>
            <p>🔧 Position Settings - Type X & Y coordinates or drag text on certificate</p>
            {position && (
              <div className={styles.positionInfo}>
                <p className={styles.coordsDisplay}>
                  ✓ Current Box: x={position.x}, y={position.y}, w={position.width}, h={position.height}
                </p>
              </div>
            )}
          </div>
          {position && (
            <button 
              className={styles.clearButton} 
              onClick={handleClear}
            >
              Reset Position
            </button>
          )}
        </div>
      </div>

      {/* Position and Size Input Fields */}
      <div className={styles.positionInputSection} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className={styles.positionInputGroup}>
          <label htmlFor="position-x" className={styles.positionInputLabel}>
            X:
          </label>
          <input
            id="position-x"
            type="number"
            value={position.x}
            onChange={handlePositionXChange}
            className={styles.positionInput}
            min="0"
          />
        </div>
        <div className={styles.positionInputGroup}>
          <label htmlFor="position-y" className={styles.positionInputLabel}>
            Y:
          </label>
          <input
            id="position-y"
            type="number"
            value={position.y}
            onChange={handlePositionYChange}
            className={styles.positionInput}
            min="0"
          />
        </div>
        <div className={styles.positionInputGroup}>
          <label htmlFor="position-width" className={styles.positionInputLabel}>
            Width:
          </label>
          <input
            id="position-width"
            type="number"
            value={position.width || 150}
            onChange={handlePositionWidthChange}
            className={styles.positionInput}
            min="50"
          />
        </div>
        <div className={styles.positionInputGroup}>
          <label htmlFor="position-height" className={styles.positionInputLabel}>
            Height:
          </label>
          <input
            id="position-height"
            type="number"
            value={position.height || 60}
            onChange={handlePositionHeightChange}
            className={styles.positionInput}
            min="20"
          />
        </div>
      </div>

      {/* Text Input and Styling */}
      <div className={styles.textInputSection}>
        <label htmlFor="preview-text-input" className={styles.textInputLabel}>
          📝 Student Name - Type to see preview on certificate:
        </label>
        <input
          id="preview-text-input"
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Type a student name..."
          className={styles.textInput}
          autoFocus
        />
        <div className={styles.previewInfo}>
          <p className={styles.textInputHint}>
            💡 Tip: Type a name and drag it on the certificate to reposition. Release to save position.
          </p>
        </div>

        {/* Font Style Controls */}
        <div className={styles.fontControlsSection}>
            <h3 className={styles.fontControlsTitle}>🎨 Font Styles</h3>
            
            <div className={styles.fontFamilyControl}>
              <label htmlFor="font-family" className={styles.fontLabel}>
                Font Family:
              </label>
              <select
                id="font-family"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className={styles.fontFamilySelect}
              >
                <optgroup label="Modern Sans-Serif">
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Calibri">Calibri</option>
                </optgroup>
                <optgroup label="Traditional Serif">
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Garamond">Garamond</option>
                  <option value="Palatino Linotype">Palatino Linotype</option>
                  <option value="Cambria">Cambria</option>
                  <option value="Bookman">Bookman</option>
                  <option value="Century Schoolbook">Century Schoolbook</option>
                </optgroup>
                <optgroup label="Display Fonts">
                  <option value="Impact">Impact</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Franklin Gothic">Franklin Gothic</option>
                  <option value="Century Gothic">Century Gothic</option>
                  <option value="Rockwell">Rockwell</option>
                </optgroup>
                <optgroup label="Monospace">
                  <option value="Courier New">Courier New</option>
                  <option value="Consolas">Consolas</option>
                  <option value="Monaco">Monaco</option>
                </optgroup>
              </select>
            </div>
            
            <div className={styles.fontColorControl} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label htmlFor="font-color" className={styles.fontLabel}>
                Text Color:
              </label>
              <input
                id="font-color"
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                style={{ cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', width: '40px', height: '40px', padding: '0' }}
              />
            </div>

            <div className={styles.fontToggleButtons}>
              <button
                className={`${styles.fontToggleBtn} ${isBold ? styles.fontToggleBtnActive : ''}`}
                onClick={() => setIsBold(!isBold)}
                title="Toggle Bold"
              >
                <strong>B</strong>
              </button>
              <button
                className={`${styles.fontToggleBtn} ${isItalic ? styles.fontToggleBtnActive : ''}`}
                onClick={() => setIsItalic(!isItalic)}
                title="Toggle Italic"
              >
                <em>I</em>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveConfig}
            disabled={saveLoading || !position}
            className={styles.saveConfigButton}
          >
            {saveLoading ? '💾 Saving...' : '💾 Save Configuration to Firebase'}
          </button>

          {saveError && <div className={styles.error}>{saveError}</div>}
          {saveSuccess && <div className={styles.success}>{saveSuccess}</div>}
      </div>

      <div
        ref={svgRef}
        className={styles.svgContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
