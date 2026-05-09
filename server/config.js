import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../config.json');

let config = {
  limits: {
    maxProjects: 6,
    maxFilesPerProject: 32,
    maxFileSize: 52428800,
    maxAvatarSize: 5242880
  },
  features: {
    enablePreview: true,
    autoSave: true,
    autoSaveDelay: 1000
  },
  cleanup: {
    inactiveDays: 90,
    warningDays: 60,
    enableAutoCleanup: true
  }
};

function mergeSection(target, source) {
  return source && typeof source === 'object' && !Array.isArray(source)
    ? { ...target, ...source }
    : target;
}

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  const parsedConfig = JSON.parse(configData);
  
  if (parsedConfig && typeof parsedConfig === 'object') {
    config = {
      ...config,
      limits: mergeSection(config.limits, parsedConfig.limits),
      features: mergeSection(config.features, parsedConfig.features),
      cleanup: mergeSection(config.cleanup, parsedConfig.cleanup)
    };
  }
} catch (err) {
  console.log('Using default config');
}

export default config;

