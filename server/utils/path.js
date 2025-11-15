export function normalizeProjectPath(input) {
  if (typeof input !== 'string') {
    return null;
  }

  let normalized = input.replace(/\\+/g, '/').trim();
  normalized = normalized.replace(/\/+/g, '/');

  const segments = normalized
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0);

  if (segments.length === 0) {
    return null;
  }

  if (segments.some(segment => segment === '.' || segment === '..')) {
    return null;
  }

  return segments.join('/');
}

export function extractFileNameFromPath(path) {
  if (!path) {
    return null;
  }

  const segments = path.split('/');
  const name = segments[segments.length - 1];

  return name || null;
}

