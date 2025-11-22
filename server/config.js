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

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  const parsedConfig = JSON.parse(configData);
  
  if (parsedConfig && typeof parsedConfig === 'object') {
    if (parsedConfig.limits && typeof parsedConfig.limits === 'object') {
      config.limits = { ...config.limits, ...parsedConfig.limits };
    }
    if (parsedConfig.features && typeof parsedConfig.features === 'object') {
      config.features = { ...config.features, ...parsedConfig.features };
    }
    if (parsedConfig.cleanup && typeof parsedConfig.cleanup === 'object') {
      config.cleanup = { ...config.cleanup, ...parsedConfig.cleanup };
    }
  }
} catch (err) {
  console.log('Using default config');
}

export default config;

