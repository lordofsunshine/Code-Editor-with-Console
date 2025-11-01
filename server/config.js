import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../config.json');

let config = {
  limits: {
    maxProjects: 3,
    maxFilesPerProject: 16,
    maxFileSize: 10485760,
    maxAvatarSize: 2097152
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
  config = JSON.parse(configData);
} catch (err) {
  console.log('Using default config');
}

export default config;

