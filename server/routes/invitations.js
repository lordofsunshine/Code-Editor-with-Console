import {
  emitToUser,
  emitToUsers,
  isValidUsername,
  parsePositiveInteger,
  parsePositiveIntegerParam,
  requireAuth
} from '../utils/request.js';

export async function invitationRoutes(fastify, options) {
  fastify.addHook('preHandler', requireAuth);

  fastify.post('/send', async (request, reply) => {
    try {
      const { projectId, username, role = 'editor' } = request.body;
      const fromUserId = request.session.userId;
      const normalizedProjectId = parsePositiveInteger(projectId);

      if (!projectId || !username || typeof username !== 'string') {
        return reply.code(400).send({ error: 'Invalid request' });
      }

      if (!normalizedProjectId) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      if (!isValidUsername(username, 3, 100)) {
        return reply.code(400).send({ error: 'Invalid username' });
      }

      if (!['viewer', 'editor'].includes(role)) {
        return reply.code(400).send({ error: 'Invalid role' });
      }

      const project = fastify.db.getProject(normalizedProjectId, fromUserId);
      if (!project) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const existingInvitations = fastify.db.getInvitationsByProject(normalizedProjectId);
      const activeInvitations = existingInvitations.filter(inv => 
        inv.status === 'accepted' || inv.status === 'pending'
      );

      if (activeInvitations.length >= 2) {
        return reply.code(400).send({ error: 'Maximum 2 collaborators allowed per project' });
      }

      const toUser = fastify.db.getUserByUsernameForInvite(username);
      if (!toUser) {
        return reply.code(404).send({ error: 'User not found' });
      }

      if (toUser.id === fromUserId) {
        return reply.code(400).send({ error: 'Cannot invite yourself' });
      }

      if (fastify.db.isCollaborator(normalizedProjectId, toUser.id)) {
        return reply.code(400).send({ error: 'User is already a collaborator' });
      }

      const userInvitations = existingInvitations.filter(inv => 
        inv.to_user_id === toUser.id && inv.status === 'pending'
      );

      if (userInvitations.length > 0) {
        return reply.code(400).send({ error: 'Invitation already pending for this user' });
      }

      const result = fastify.db.createInvitation(normalizedProjectId, fromUserId, toUser.id, role);
      const invitation = fastify.db.getInvitation(result.lastInsertRowid);
      
      emitToUser(fastify.io, toUser.id, 'invitation-received', invitation);

      return { success: true, invitation };
    } catch (err) {
      fastify.log.error('Invitation error:', err);
      return reply.code(500).send({ error: 'Failed to send invitation' });
    }
  });

  fastify.get('/received', async (request, reply) => {
    const userId = request.session.userId;
    const invitations = fastify.db.getInvitationsByUser(userId);
    return invitations;
  });

  fastify.get('/project/:projectId', async (request, reply) => {
    try {
      const projectId = parsePositiveIntegerParam(request, 'projectId');
      const userId = request.session.userId;

      if (!projectId) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      const project = fastify.db.getProject(projectId, userId);
      if (!project) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const invitations = fastify.db.getInvitationsByProject(projectId);
      return invitations;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/:invitationId/accept', async (request, reply) => {
    try {
      const invitationId = parsePositiveIntegerParam(request, 'invitationId');
      const userId = request.session.userId;

      if (!invitationId) {
        return reply.code(400).send({ error: 'Invalid invitation ID' });
      }

      const invitation = fastify.db.getInvitation(invitationId);
      if (!invitation) {
        return reply.code(404).send({ error: 'Invitation not found' });
      }

      if (invitation.to_user_id !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      if (invitation.status !== 'pending') {
        return reply.code(400).send({ error: 'Invitation already processed' });
      }

      fastify.db.addCollaborator(invitation.project_id, userId, invitation.role);
      fastify.db.updateInvitationStatus(invitationId, 'accepted');
      emitToUsers(fastify.io, [invitation.from_user_id, userId], 'invitation-updated');
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to accept invitation' });
    }
  });

  fastify.post('/:invitationId/reject', async (request, reply) => {
    try {
      const invitationId = parsePositiveIntegerParam(request, 'invitationId');
      const userId = request.session.userId;

      if (!invitationId) {
        return reply.code(400).send({ error: 'Invalid invitation ID' });
      }

      const invitation = fastify.db.getInvitation(invitationId);
      if (!invitation) {
        return reply.code(404).send({ error: 'Invitation not found' });
      }

      if (invitation.to_user_id !== userId) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      if (invitation.status !== 'pending') {
        return reply.code(400).send({ error: 'Invitation already processed' });
      }

      fastify.db.updateInvitationStatus(invitationId, 'rejected');
      emitToUsers(fastify.io, [invitation.from_user_id, userId], 'invitation-updated');
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.get('/collaborators/:projectId', async (request, reply) => {
    try {
      const projectId = parsePositiveIntegerParam(request, 'projectId');
      const userId = request.session.userId;

      if (!projectId) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      if (!fastify.db.hasProjectAccess(projectId, userId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const collaborators = fastify.db.getCollaborators(projectId);
      return collaborators;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.delete('/collaborators/:projectId/:collaboratorId', async (request, reply) => {
    try {
      const projectId = parsePositiveIntegerParam(request, 'projectId');
      const collaboratorId = parsePositiveIntegerParam(request, 'collaboratorId');
      const userId = request.session.userId;

      if (!projectId || !collaboratorId) {
        return reply.code(400).send({ error: 'Invalid IDs' });
      }

      if (collaboratorId === userId) {
        return reply.code(400).send({ error: 'Cannot remove yourself' });
      }

      const project = fastify.db.getProject(projectId, userId);
      if (!project) {
        return reply.code(403).send({ error: 'Only owner can remove collaborators' });
      }

      if (!fastify.db.isCollaborator(projectId, collaboratorId)) {
        return reply.code(404).send({ error: 'User is not a collaborator' });
      }

      fastify.db.removeCollaborator(projectId, collaboratorId);
      
      const invitations = fastify.db.getInvitationsByProject(projectId);
      const userInvitation = invitations.find(inv => inv.to_user_id === collaboratorId && inv.status === 'accepted');
      
      if (userInvitation) {
        fastify.db.updateInvitationStatus(userInvitation.id, 'removed');
      }
      
      emitToUser(fastify.io, collaboratorId, 'kicked-from-project', {
        projectId,
        projectName: project.name,
        reason: 'removed'
      });
      emitToUsers(fastify.io, [collaboratorId, userId], 'invitation-updated');
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/:invitationId/cancel', async (request, reply) => {
    try {
      const invitationId = parsePositiveIntegerParam(request, 'invitationId');
      const userId = request.session.userId;

      if (!invitationId) {
        return reply.code(400).send({ error: 'Invalid invitation ID' });
      }

      const invitation = fastify.db.getInvitation(invitationId);
      if (!invitation) {
        return reply.code(404).send({ error: 'Invitation not found' });
      }

      const project = fastify.db.getProject(invitation.project_id, userId);
      if (!project) {
        return reply.code(403).send({ error: 'Only owner can cancel invitations' });
      }

      if (invitation.status !== 'pending') {
        return reply.code(400).send({ error: 'Can only cancel pending invitations' });
      }

      fastify.db.updateInvitationStatus(invitationId, 'cancelled');
      emitToUsers(fastify.io, [invitation.to_user_id, userId], 'invitation-updated');
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/leave/:projectId', async (request, reply) => {
    try {
      const projectId = parsePositiveIntegerParam(request, 'projectId');
      const userId = request.session.userId;

      if (!projectId) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      if (!fastify.db.isCollaborator(projectId, userId)) {
        return reply.code(403).send({ error: 'You are not a collaborator' });
      }

      const project = fastify.db.getProjectById(projectId);
      if (project && project.user_id === userId) {
        return reply.code(400).send({ error: 'Project owner cannot leave' });
      }

      fastify.db.removeCollaborator(projectId, userId);
      
      const invitations = fastify.db.getInvitationsByProject(projectId);
      const userInvitation = invitations.find(inv => inv.to_user_id === userId && inv.status === 'accepted');
      
      if (userInvitation) {
        fastify.db.updateInvitationStatus(userInvitation.id, 'left');
        
        emitToUser(fastify.io, userInvitation.from_user_id, 'invitation-updated');
      }
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });
}

