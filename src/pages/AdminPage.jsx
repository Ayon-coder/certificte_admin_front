import React, { useState } from 'react';
import Papa from 'papaparse';
import FileUpload from '../components/FileUpload';
import SVGEditor from '../components/SVGEditor';
import CSVPreview from '../components/CSVPreview';
import { uploadCSV, uploadSVG, updateTemplatePosition, getEvents, createEvent, deleteEvent, getTemplates, deleteTemplate, getStudents, getTemplate } from '../lib/api';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventError, setEventError] = useState('');

  const [csvData, setCSVData] = useState(null);
  const [csvLoading, setCSVLoading] = useState(false);
  const [csvError, setCSVError] = useState('');

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');

  const [svgUrl, setSvgUrl] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [currentTemplateId, setCurrentTemplateId] = useState('');
  const [svgLoading, setSvgLoading] = useState(false);
  const [svgError, setSvgError] = useState('');
  const [templateType, setTemplateType] = useState('svg');
  const [templateDimensions, setTemplateDimensions] = useState(null);

  const [position, setPosition] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  // Store loaded template configuration
  const [loadedConfig, setLoadedConfig] = useState({});

  React.useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to load events', error);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) return;
    setIsCreatingEvent(true);
    setEventError('');
    try {
      const result = await createEvent(newEventName.trim());
      setEvents([result.event, ...events]);
      setSelectedEventId(result.event.id);
      setNewEventName('');
      setSuccessMessage(`✓ Event "${result.event.name}" created successfully`);
      
      // Clear previous event data
      setCSVData(null);
      setSvgUrl('');
      setTemplateId('');
      setPosition(null);
    } catch (error) {
      setEventError(error.message);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleEventChange = (e) => {
    setSelectedEventId(e.target.value);
    setCSVData(null);
    setSvgUrl('');
    setTemplateId('');
    setCurrentTemplateId('');
    setPosition(null);
    setSuccessMessage('');
    setTemplates([]);
    setTemplatesError('');
    setStudents([]);
    setStudentsError('');
    setLoadedConfig({});
    
    if (e.target.value) {
      loadTemplates(e.target.value);
      loadStudents(e.target.value);
    }
  };

  const loadTemplates = async (eventId) => {
    setTemplatesLoading(true);
    setTemplatesError('');
    try {
      const data = await getTemplates(eventId);
      console.log('Raw templates from API:', data.templates);
      
      // Ensure all templates have an id property
      const templatesWithIds = (data.templates || []).map(template => {
        if (!template.id && template.templateId) {
          template.id = template.templateId;
        }
        console.log('Template processed:', { id: template.id, templateId: template.templateId, isSvg: template.isSvg });
        return template;
      });
      
      setTemplates(templatesWithIds);
    } catch (error) {
      setTemplatesError(error.message);
      setTemplates([]);
      console.error('Error loading templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadStudents = async (eventId) => {
    setStudentsLoading(true);
    setStudentsError('');
    try {
      const data = await getStudents(eventId);
      const studentList = (data.students || []).map(student => ({
        name: student.name,
        email: student.email
      }));
      setStudents(studentList);
      setCSVData(studentList);
    } catch (error) {
      setStudentsError(error.message);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleMigrateOldTemplates = async () => {
    setIsMigrating(true);
    setMigrationStatus('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/admin/migrate-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Migration failed');
      }
      
      const result = await response.json();
      setMigrationStatus(`✅ Migration complete! Updated ${result.totalUpdated} templates with Cloudinary URLs.`);
      
      // Reload templates
      if (selectedEventId) {
        await loadTemplates(selectedEventId);
      }
    } catch (error) {
      setMigrationStatus(`❌ Migration failed: ${error.message}`);
      console.error('Migration error:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;
    
    if (!window.confirm("Are you sure you want to delete this event? This action will remove it from the dashboard.")) {
      return;
    }

    try {
      await deleteEvent(selectedEventId);
      setEvents(events.filter(e => e.id !== selectedEventId));
      setSelectedEventId('');
      setCSVData(null);
      setSvgUrl('');
      setTemplateId('');
      setPosition(null);
      setTemplates([]);
      setStudents([]);
      setSuccessMessage('✓ Event deleted successfully');
    } catch (error) {
      setEventError(error.message);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteTemplate(selectedEventId, templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
      
      // Clear SVG display if the deleted template was the current one
      if (templateId === currentTemplateId) {
        setSvgUrl('');
        setTemplateId('');
        setCurrentTemplateId('');
        setPosition(null);
      }
      
      setSuccessMessage('✓ Template deleted successfully');
    } catch (error) {
      setEventError(error.message);
    }
  };

  const handleCSVUpload = async (file) => {
    setCSVLoading(true);
    setCSVError('');
    setSuccessMessage('');

    try {
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors.length > 0) {
        throw new Error('Invalid CSV format');
      }

      const cleanedData = parsed.data.map((record) => {
        const nameKey = Object.keys(record).find(k => k.toLowerCase() === 'name');
        const emailKey = Object.keys(record).find(k => k.toLowerCase() === 'email');
        return {
          name: (record[nameKey] || '').trim(),
          email: (record[emailKey] || '').trim().toLowerCase(),
        };
      });

      const result = await uploadCSV(file, selectedEventId);
      setCSVData(cleanedData);
      setStudents(cleanedData);
      setSuccessMessage(`✓ ${result.message}`);
      
      // Reload students from database
      await loadStudents(selectedEventId);
    } catch (error) {
      setCSVError(error.message);
    } finally {
      setCSVLoading(false);
    }
  };

  const handleSVGUpload = async (file) => {
    setSvgLoading(true);
    setSvgError('');
    setSuccessMessage('');
    setPosition(null);

    try {
      const newTemplateId = `template_${Date.now()}`;
      const result = await uploadSVG(file, newTemplateId, selectedEventId);

      setTemplateId(result.templateId);
      setCurrentTemplateId(result.templateId);
      // Use backend proxy to serve the SVG (avoids CORS issues with Cloudinary)
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      if (result.isSvg) {
        setSvgUrl(`${API_URL}/api/events/${selectedEventId}/templates/${result.templateId}/svg`);
        setTemplateType('svg');
      } else {
        setSvgUrl(result.svgUrl);
        setTemplateType('image');
      }
      setTemplateDimensions({ width: result.width, height: result.height });
      setSuccessMessage('✓ Template uploaded successfully');
      
      // Reload templates list
      await loadTemplates(selectedEventId);
    } catch (error) {
      setSvgError(error.message);
    } finally {
      setSvgLoading(false);
    }
  };

  const handlePositionSelect = (coords) => {
    setPosition(coords);
  };

  const handleSavePosition = async () => {
    if (!templateId || !position) {
      setSaveError('Please upload SVG and select a position');
      return;
    }

    setSaveLoading(true);
    setSaveError('');
    setSuccessMessage('');

    try {
      const config = {
        position,
        fontColor: loadedConfig.fontColor || '#000000',
        fontStyle: loadedConfig.fontStyle || 'normal',
        fontWeight: loadedConfig.fontWeight || 'bold',
        fontFamily: loadedConfig.fontFamily || 'Arial',
      };
      
      await updateTemplatePosition(selectedEventId, templateId, position);
      setSuccessMessage(
        `✓ Position saved: x=${position.x}, y=${position.y}`
      );
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Certificate Generator - Admin Panel</h1>

      {successMessage && (
        <div className={styles.success}>{successMessage}</div>
      )}

      <div className={styles.section}>
        <h2>0. Select or Create Event Master Field</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <select 
            value={selectedEventId} 
            onChange={handleEventChange}
            style={{ padding: '0.5rem', flexGrow: 1, fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">-- Select an Event --</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
          {selectedEventId && (
            <button 
              onClick={handleDeleteEvent}
              style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              title="Delete Selected Event"
            >
              Delete
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Or type to create a new event (e.g. Chess Tournament)" 
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            style={{ padding: '0.5rem', flexGrow: 1, fontSize: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button 
            onClick={handleCreateEvent}
            disabled={isCreatingEvent || !newEventName.trim()}
            style={{ padding: '0.5rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
          >
            {isCreatingEvent ? 'Creating...' : 'Create Event'}
          </button>
        </div>
        {eventError && <div className={styles.error}>{eventError}</div>}
      </div>

      {!selectedEventId ? (
        <div className={styles.section}>
          <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666', padding: '2rem' }}>
            Please select or create an event above to start uploading data and templates.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.section}>
            <h2>1. Upload Student Data for this Event</h2>
            <FileUpload
              onFileSelect={handleCSVUpload}
              accept=".csv"
              label="Upload CSV (name, email)"
              disabled={csvLoading}
            />
            {csvError && <div className={styles.error}>{csvError}</div>}
          </div>

          <div className={styles.section}>
            <h2>2. Upload Certificate Template for this Event</h2>
            <FileUpload
              onFileSelect={handleSVGUpload}
              accept=".svg,.png,.jpg,.jpeg,.pdf"
              label="Upload Template (SVG, PNG, JPG, PDF)"
              disabled={svgLoading}
            />
            {svgError && <div className={styles.error}>{svgError}</div>}
          </div>

          <div className={styles.section}>
            <h2>2.1 View & Manage Templates</h2>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                onClick={handleMigrateOldTemplates}
                disabled={isMigrating}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isMigrating ? 'not-allowed' : 'pointer',
                  opacity: isMigrating ? 0.6 : 1,
                  fontSize: '0.9rem'
                }}
              >
                {isMigrating ? 'Migrating...' : '🔧 Migrate Old Templates'}
              </button>
              {migrationStatus && (
                <span style={{ fontSize: '0.9rem', color: migrationStatus.includes('✅') ? '#10b981' : '#ef4444' }}>
                  {migrationStatus}
                </span>
              )}
            </div>
            {templatesLoading ? (
              <p style={{ color: '#666' }}>Loading templates...</p>
            ) : templatesError ? (
              <div className={styles.error}>{templatesError}</div>
            ) : templates.length === 0 ? (
              <p style={{ color: '#666' }}>No templates uploaded yet. Upload one above to get started.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {templates.map((template, index) => {
                  const templateId = template.id || template.templateId;
                  return (
                  <div key={templateId || index} style={{ 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    padding: '1rem', 
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#333', wordBreak: 'break-word' }}>
                      Template {templateId?.substring(9, 18) || 'N/A'}
                    </h4>
                    {template.cloudinaryUrl && (
                      <a 
                        href={template.cloudinaryUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', fontSize: '0.85rem', textDecoration: 'none' }}
                      >
                        View in Cloudinary
                      </a>
                    )}
                    {template.namePosition && (
                      <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#666' }}>
                        Position: ({template.namePosition.x}, {template.namePosition.y})
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                      <button
                        onClick={async () => {
                          try {
                            const templateId = template.id || template.templateId;
                            console.log('Edit clicked for template:', { id: templateId, isSvg: template.isSvg });
                            
                            if (!templateId) {
                              throw new Error('Template ID is missing');
                            }
                            
                            // Fetch full template details from Firebase
                            const fullTemplate = await getTemplate(selectedEventId, templateId);
                            console.log('Loaded template:', fullTemplate);
                            
                            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                            let targetSvgUrl;
                            if (template.isSvg) {
                              targetSvgUrl = `${API_URL}/api/events/${selectedEventId}/templates/${templateId}/svg`;
                            } else {
                              targetSvgUrl = fullTemplate.cloudinaryUrl || fullTemplate.svgUrl;
                            }
                            console.log('Setting SVG/Image URL:', targetSvgUrl);
                            console.log('Template type:', template.isSvg ? 'svg' : 'image');
                            
                            // Set all template data
                            setSvgUrl(targetSvgUrl);
                            setTemplateId(templateId);
                            setCurrentTemplateId(templateId);
                            setTemplateType(template.isSvg ? 'svg' : 'image');
                            setTemplateDimensions({ 
                              width: template.width || 800, 
                              height: template.height || 600 
                            });
                            setPosition(template.namePosition || null);
                            
                            // Store all configuration for SVGEditor to load
                            setLoadedConfig({
                              fontColor: fullTemplate.fontColor || '#000000',
                              fontStyle: fullTemplate.fontStyle || 'normal',
                              fontWeight: fullTemplate.fontWeight || 'bold',
                              fontFamily: fullTemplate.fontFamily || 'Arial',
                              position: fullTemplate.namePosition || null
                            });
                          } catch (error) {
                            console.error('Error loading template:', error);
                            setEventError('Failed to load template configuration: ' + error.message);
                          }
                        }}
                        style={{ 
                          flex: 1,
                          padding: '0.4rem 0.8rem', 
                          background: '#3b82f6', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          fontSize: '0.85rem'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const templateId = template.id || template.templateId;
                          if (!templateId) {
                            setEventError('Template ID is missing');
                            return;
                          }
                          handleDeleteTemplate(templateId);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '0.4rem 0.8rem', 
                          background: '#ef4444', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2>2.2 View Student CSV Data</h2>
            {studentsLoading ? (
              <p style={{ color: '#666' }}>Loading student data...</p>
            ) : students.length > 0 ? (
              <CSVPreview data={students} loading={false} error={null} />
            ) : (
              <p style={{ color: '#666' }}>No student data. Upload a CSV file above to add students to this event.</p>
            )}
          </div>

      {svgUrl && (
        <div className={styles.section}>
          <h2>3. Select Name Position on Certificate</h2>
          <SVGEditor 
            svgUrl={svgUrl} 
            onPositionSelect={handlePositionSelect}
            eventId={selectedEventId}
            templateId={templateId}
            templateType={templateType}
            templateDimensions={templateDimensions}
            initialConfig={loadedConfig}
          />

          <button
            onClick={handleSavePosition}
            disabled={!position || saveLoading}
            className={styles.saveButton}
          >
            {saveLoading ? 'Saving...' : 'Save Position'}
          </button>

          {saveError && <div className={styles.error}>{saveError}</div>}
        </div>
      )}
        </>
      )}
    </div>
  );
}
