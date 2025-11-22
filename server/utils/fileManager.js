import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { encryptData, decryptData, generateProjectKey, hashProjectId, hashFileName } from './encryption.js';
import { compressFile, decompressFile, isMediaFile } from './compression.js';

const STORAGE_ROOT = path.join(process.cwd(), 'storage');
const PROJECTS_DIR = path.join(STORAGE_ROOT, 'projects');

async function ensureStorageExists() {
  if (!existsSync(STORAGE_ROOT)) {
    await fs.mkdir(STORAGE_ROOT, { recursive: true, mode: 0o700 });
  }
  if (!existsSync(PROJECTS_DIR)) {
    await fs.mkdir(PROJECTS_DIR, { recursive: true, mode: 0o700 });
  }
}

function validatePath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid path');
  }
  const normalized = path.normalize(filePath);
  if (normalized.includes('..') || path.isAbsolute(normalized) || normalized.includes('\0')) {
    throw new Error('Invalid path');
  }
  const suspicious = ['../', '..\\', './', '.\\'];
  if (suspicious.some(s => filePath.includes(s))) {
    throw new Error('Invalid path');
  }
  return normalized;
}

export async function initStorage() {
  await ensureStorageExists();
}

export function createProjectKey() {
  return generateProjectKey();
}

function getProjectDir(projectId) {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('Invalid project ID');
  }
  const hashedId = hashProjectId(projectId);
  return path.join(PROJECTS_DIR, hashedId);
}

function getFilePath(projectId, fileId, projectKey) {
  if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
    throw new Error('Invalid IDs');
  }
  if (!projectKey || typeof projectKey !== 'string') {
    throw new Error('Invalid project key');
  }
  const projectDir = getProjectDir(projectId);
  const hashedFileName = hashFileName(String(fileId), projectKey);
  return path.join(projectDir, hashedFileName);
}

export async function createProjectStorage(projectId) {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('Invalid project ID');
  }
  const projectDir = getProjectDir(projectId);
  
  if (existsSync(projectDir)) {
    return;
  }
  
  await fs.mkdir(projectDir, { recursive: true, mode: 0o700 });
}

export async function saveFile(projectId, fileId, fileName, content, projectKey) {
  if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
    throw new Error('Invalid IDs');
  }
  if (!fileName || typeof fileName !== 'string' || fileName.length > 255) {
    throw new Error('Invalid file name');
  }
  if (!projectKey || typeof projectKey !== 'string') {
    throw new Error('Invalid project key');
  }
  
  validatePath(fileName);
  
  const projectDir = getProjectDir(projectId);
  
  if (!existsSync(projectDir)) {
    await createProjectStorage(projectId);
  }
  
  let buffer;
  if (typeof content === 'string') {
    if (content.length > 52428800) {
      throw new Error('Content too large');
    }
    if (content.startsWith('data:')) {
      const parts = content.split(',');
      if (parts.length !== 2) {
        throw new Error('Invalid data URL');
      }
      const base64Data = parts[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(content, 'utf8');
    }
  } else if (Buffer.isBuffer(content)) {
    buffer = content;
  } else {
    throw new Error('Invalid content type');
  }

  if (buffer.length > 52428800) {
    throw new Error('Content too large');
  }
  
  let compressed;
  try {
    compressed = await compressFile(buffer, fileName);
  } catch (err) {
    console.warn(`Compression failed for ${fileName}, using original buffer:`, err.message);
    compressed = buffer;
  }
  
  const encrypted = encryptData(compressed, projectKey);
  
  const filePath = getFilePath(projectId, fileId, projectKey);
  await fs.writeFile(filePath, encrypted, { mode: 0o600 });
}

export async function readFile(projectId, fileId, fileName, projectKey, asDataUrl = false) {
  if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
    throw new Error('Invalid IDs');
  }
  if (!fileName || typeof fileName !== 'string' || fileName.length > 255) {
    throw new Error('Invalid file name');
  }
  if (!projectKey || typeof projectKey !== 'string') {
    throw new Error('Invalid project key');
  }

  const filePath = getFilePath(projectId, fileId, projectKey);
  
  if (!existsSync(filePath)) {
    throw new Error('File not found');
  }

  const stats = await fs.stat(filePath);
  if (stats.size > 104857600) {
    throw new Error('File too large');
  }
  
  const encrypted = await fs.readFile(filePath);
  const decrypted = decryptData(encrypted, projectKey);
  const decompressed = await decompressFile(decrypted, fileName);
  
  if (asDataUrl && isMediaFile(fileName)) {
    const ext = fileName.split('.').pop().toLowerCase();
    let mimeType = 'application/octet-stream';
    
    if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === 'png') mimeType = 'image/png';
    else if (ext === 'gif') mimeType = 'image/gif';
    else if (ext === 'webp') mimeType = 'image/webp';
    else if (ext === 'svg') mimeType = 'image/svg+xml';
    else if (ext === 'mp4') mimeType = 'video/mp4';
    else if (ext === 'webm') mimeType = 'video/webm';
    else if (ext === 'mp3') mimeType = 'audio/mpeg';
    else if (ext === 'wav') mimeType = 'audio/wav';
    else if (ext === 'ogg') mimeType = 'audio/ogg';
    
    const base64 = decompressed.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
  
  if (isMediaFile(fileName)) {
    return decompressed;
  }
  
  return decompressed.toString('utf8');
}

export async function deleteFile(projectId, fileId, projectKey) {
  if (!Number.isInteger(projectId) || projectId <= 0 || !Number.isInteger(fileId) || fileId <= 0) {
    throw new Error('Invalid IDs');
  }
  if (!projectKey || typeof projectKey !== 'string') {
    throw new Error('Invalid project key');
  }

  const filePath = getFilePath(projectId, fileId, projectKey);
  
  if (existsSync(filePath)) {
    await fs.unlink(filePath);
  }
}

export async function deleteProject(projectId) {
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new Error('Invalid project ID');
  }

  const projectDir = getProjectDir(projectId);
  
  if (!existsSync(projectDir)) {
    return;
  }

  const resolvedProjectDir = path.resolve(projectDir);
  const resolvedProjectsDir = path.resolve(PROJECTS_DIR);
  
  if (!resolvedProjectDir.startsWith(resolvedProjectsDir)) {
    throw new Error('Invalid project directory');
  }
  
  await fs.rm(projectDir, { recursive: true, force: true });
}

export async function getStorageStats() {
  const stats = {
    totalProjects: 0,
    totalFiles: 0,
    totalSize: 0
  };
  
  if (!existsSync(PROJECTS_DIR)) {
    return stats;
  }
  
  const projects = await fs.readdir(PROJECTS_DIR);
  stats.totalProjects = projects.length;
  
  for (const project of projects) {
    const projectPath = path.join(PROJECTS_DIR, project);
    const projectStats = await fs.stat(projectPath);
    
    if (projectStats.isDirectory()) {
      const files = await fs.readdir(projectPath);
      stats.totalFiles += files.length;
      
      for (const file of files) {
        const filePath = path.join(projectPath, file);
        const fileStats = await fs.stat(filePath);
        stats.totalSize += fileStats.size;
      }
    }
  }
  
  return stats;
}

