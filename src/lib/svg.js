export function getSVGCoordinates(svgElement, event) {
  if (!svgElement) return null;

  // Use the SVG's built-in coordinate transformation API
  // This correctly handles viewBox, preserveAspectRatio, and any CSS transforms
  const ctm = svgElement.getScreenCTM();
  if (!ctm) {
    // Fallback: use bounding rect
    const rect = svgElement.getBoundingClientRect();
    return {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top),
    };
  }

  const point = svgElement.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  // Transform screen coordinates → SVG coordinate space
  const svgPoint = point.matrixTransform(ctm.inverse());

  return {
    x: Math.round(svgPoint.x),
    y: Math.round(svgPoint.y),
  };
}

export function createTextElement(x, y, text) {
  const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textElement.setAttribute('x', x);
  textElement.setAttribute('y', y);
  textElement.setAttribute('font-size', '24');
  textElement.setAttribute('font-family', 'Arial');
  textElement.setAttribute('fill', 'black');
  textElement.textContent = text;
  return textElement;
}

export function parseSVG(svgString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid SVG');
  }
  return doc.documentElement;
}
