export function normalizeProjectPath(input) {
  if (typeof input !== 'string' || input.length === 0 || input.length > 500) {
    return null;
  }

  if (input.includes('\0')) {
    return null;
  }

  let normalized = input.replace(/\\+/g, '/').trim();
  normalized = normalized.replace(/\/+/g, '/');
  normalized = normalized.replace(/^\/+/, '');

  const segments = normalized
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0);

  if (segments.length === 0) {
    return null;
  }

  if (segments.some(segment => segment === '.' || segment === '..' || segment.includes('\0'))) {
    return null;
  }

  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (segments.some(segment => invalidChars.test(segment))) {
    return null;
  }

  return segments.join('/');
}

export function extractFileNameFromPath(path) {
  if (!path || typeof path !== 'string') {
    return null;
  }

  const segments = path.split('/');
  const name = segments[segments.length - 1];

  if (!name || name.length > 255) {
    return null;
  }

  return name;
}

