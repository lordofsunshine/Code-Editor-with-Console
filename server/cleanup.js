import cron from 'node-cron';
import config from './config.js';

export function initCleanupTasks(db) {
  
  if (!config.cleanup.enableAutoCleanup) {
    console.log('Auto cleanup disabled in config');
    return;
  }

  cron.schedule('0 3 * * *', () => {
    console.log('Running cleanup tasks...');
    
    try {
      const inactiveDays = config.cleanup.inactiveDays || 90;
      const inactiveProjects = db.deleteInactiveProjects(inactiveDays);
      console.log(`Deleted ${inactiveProjects.changes} inactive projects`);
      
      const inactiveUsers = db.deleteInactiveUsers(inactiveDays);
      console.log(`Deleted ${inactiveUsers.changes} inactive users`);
      
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

