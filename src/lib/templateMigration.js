/**
 * Utility to check template URLs in Firebase
 * Run this to verify which templates are missing Cloudinary URLs
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function checkTemplateURLs(eventId) {
  try {
    const response = await fetch(`${API_URL}/api/events/${eventId}/templates`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    
    const { templates } = await response.json();
    
    const summary = {
      total: templates.length,
      withUrl: 0,
      withoutUrl: 0,
      missingBoth: [],
      incomplete: []
    };

    templates.forEach(template => {
      if (template.svgUrl || template.cloudinaryUrl) {
        summary.withUrl++;
      } else {
        summary.withoutUrl++;
        
        if (!template.storagePath) {
          summary.missingBoth.push({
            id: template.id,
            fileName: template.fileName,
            reason: 'No svgUrl, cloudinaryUrl, or storagePath'
          });
        } else {
          summary.incomplete.push({
            id: template.id,
            fileName: template.fileName,
            storagePath: template.storagePath,
            reason: 'Has storagePath, can be migrated'
          });
        }
      }
    });

    return summary;
  } catch (error) {
    console.error('Error checking templates:', error);
    throw error;
  }
}

export async function migrateTemplateURLs() {
  try {
    console.log('🔄 Starting template migration...');
    const response = await fetch(`${API_URL}/api/admin/migrate-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) throw new Error('Migration failed');
    
    const result = await response.json();
    console.log(`✅ Migration complete! Updated ${result.totalUpdated} templates`);
    
    return result;
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
