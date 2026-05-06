const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function uploadCSV(file, eventId) {
  const formData = new FormData();
  formData.append('file', file);
  if (eventId) formData.append('eventId', eventId);

  const response = await fetch(`${API_URL}/api/upload/csv`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'CSV upload failed');
  }

  return response.json();
}

export async function uploadSVG(file, templateId, eventId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('templateId', templateId);
  if (eventId) formData.append('eventId', eventId);

  const response = await fetch(`${API_URL}/api/upload/svg`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'SVG upload failed');
  }

  return response.json();
}

export async function getEvents() {
  const response = await fetch(`${API_URL}/api/events`);
  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
}

export async function createEvent(name) {
  const response = await fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create event');
  }
  return response.json();
}

export async function deleteEvent(eventId) {
  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete event');
  }
  return response.json();
}

export async function getTemplates(eventId) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/templates`);

  if (!response.ok) {
    throw new Error('Failed to fetch templates');
  }

  const data = response.json();
  console.log('getTemplates response:', data);
  return data;
}

export async function getTemplate(eventId, templateId) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/templates/${templateId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch template');
  }

  return response.json();
}

export async function updateTemplatePosition(eventId, templateId, namePosition) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/templates/${templateId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ namePosition }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update position');
  }

  return response.json();
}

export async function saveTemplateConfig(eventId, templateId, config) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/templates/${templateId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      namePosition: config.position,
      textSize: config.textSize,
      fontStyle: config.fontStyle,
      fontWeight: config.fontWeight,
      fontColor: config.fontColor,
      config: config, // Save complete config
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save template configuration');
  }

  return response.json();
}

export async function deleteTemplate(eventId, templateId) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/templates/${templateId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete template');
  }

  return response.json();
}

export async function getStudents(eventId) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/students`);

  if (!response.ok) {
    throw new Error('Failed to fetch students');
  }

  return response.json();
}
