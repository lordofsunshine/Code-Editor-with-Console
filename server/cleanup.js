import cron from 'node-cron';
import config from './config.js';
import { deleteProject as deleteProjectFiles } from './utils/fileManager.js';

export function initCleanupTasks(db) {
  
  if (!config.cleanup.enableAutoCleanup) {
    console.log('Auto cleanup disabled in config');
    return;
  }

  cron.schedule('0 3 * * *', async () => {
    console.log('Running cleanup tasks...');
    
    try {
      const inactiveDays = config.cleanup.inactiveDays || 90;
      
      if (!Number.isInteger(inactiveDays) || inactiveDays <= 0) {
        console.error('Invalid inactiveDays config');
        return;
      }
      
      const projectsToDelete = db.getInactiveProjects(inactiveDays);
      for (const project of projectsToDelete) {
        try {
          await deleteProjectFiles(project.id);
        } catch (err) {
          console.error(`Error deleting files for project ${project.id}:`, err);
        }
      }
      
      const inactiveProjects = db.deleteInactiveProjects(inactiveDays);
      console.log(`Deleted ${inactiveProjects.changes || 0} inactive projects`);
      
      const inactiveUsers = db.deleteInactiveUsers(inactiveDays);
      console.log(`Deleted ${inactiveUsers.changes || 0} inactive users`);
      
      const oldChats = db.deleteOldChatMessages();
      console.log(`Deleted old chat messages: ${oldChats.changes || 0} rows`);
      
      db.optimize();
      console.log('Database optimized');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });

  cron.schedule('0 4 * * 0', () => {
    console.log('Running weekly vacuum...');
    try {
      db.vacuum();
      console.log('Database vacuumed');
    } catch (err) {
      console.error('Vacuum error:', err);
    }
  });

  console.log('Cleanup tasks scheduled');
}

