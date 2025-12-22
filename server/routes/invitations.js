export async function invitationRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.post('/send', async (request, reply) => {
    try {
      const { projectId, username, role = 'editor' } = request.body;
      const fromUserId = request.session.userId;

      if (!projectId || typeof projectId !== 'number' || !username || typeof username !== 'string') {
        return reply.code(400).send({ error: 'Invalid request' });
      }

      if (!Number.isInteger(projectId) || projectId <= 0) {
        return reply.code(400).send({ error: 'Invalid project ID' });
      }

      if (username.length < 3 || username.length > 100) {
        return reply.code(400).send({ error: 'Invalid username' });
      }

      if (!['viewer', 'editor'].includes(role)) {
        return reply.code(400).send({ error: 'Invalid role' });
      }

      const project = fastify.db.getProject(projectId, fromUserId);
      if (!project) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      const existingInvitations = fastify.db.getInvitationsByProject(projectId);
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

      if (fastify.db.isCollaborator(projectId, toUser.id)) {
        return reply.code(400).send({ error: 'User is already a collaborator' });
      }

      const userInvitations = existingInvitations.filter(inv => 
        inv.to_user_id === toUser.id && inv.status === 'pending'
      );

      if (userInvitations.length > 0) {
        return reply.code(400).send({ error: 'Invitation already pending for this user' });
      }

      const result = fastify.db.createInvitation(projectId, fromUserId, toUser.id, role);
      const invitation = fastify.db.getInvitation(result.lastInsertRowid);
      
      if (fastify.io) {
        const userSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === toUser.id);
        
        userSockets.forEach(s => {
          s.emit('invitation-received', invitation);
        });
      }

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
      const projectId = parseInt(request.params.projectId, 10);
      const userId = request.session.userId;

      if (isNaN(projectId) || projectId <= 0) {
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
      const invitationId = parseInt(request.params.invitationId, 10);
      const userId = request.session.userId;

      if (isNaN(invitationId) || invitationId <= 0) {
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
      
      if (fastify.io) {
        const fromUserSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === invitation.from_user_id);
        fromUserSockets.forEach(s => s.emit('invitation-updated'));
        
        const toUserSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === userId);
        toUserSockets.forEach(s => s.emit('invitation-updated'));
      }
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to accept invitation' });
    }
  });

  fastify.post('/:invitationId/reject', async (request, reply) => {
    try {
      const invitationId = parseInt(request.params.invitationId, 10);
      const userId = request.session.userId;

      if (isNaN(invitationId) || invitationId <= 0) {
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
      
      if (fastify.io) {
        const fromUserSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === invitation.from_user_id);
        fromUserSockets.forEach(s => s.emit('invitation-updated'));
        
        const toUserSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === userId);
        toUserSockets.forEach(s => s.emit('invitation-updated'));
      }
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.get('/collaborators/:projectId', async (request, reply) => {
    try {
      const projectId = parseInt(request.params.projectId, 10);
      const userId = request.session.userId;

      if (isNaN(projectId) || projectId <= 0) {
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
      const projectId = parseInt(request.params.projectId, 10);
      const collaboratorId = parseInt(request.params.collaboratorId, 10);
      const userId = request.session.userId;

      if (isNaN(projectId) || projectId <= 0 || isNaN(collaboratorId) || collaboratorId <= 0) {
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
      
      if (fastify.io) {
        const collabSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === collaboratorId);
        collabSockets.forEach(s => {
          s.emit('kicked-from-project', { 
            projectId, 
            projectName: project.name,
            reason: 'removed' 
          });
          s.emit('invitation-updated');
        });
        
        const ownerSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === userId);
        ownerSockets.forEach(s => s.emit('invitation-updated'));
      }
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/:invitationId/cancel', async (request, reply) => {
    try {
      const invitationId = parseInt(request.params.invitationId, 10);
      const userId = request.session.userId;

      if (isNaN(invitationId) || invitationId <= 0) {
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
      
      if (fastify.io) {
        const toUserSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === invitation.to_user_id);
        toUserSockets.forEach(s => s.emit('invitation-updated'));
        
        const fromUserSockets = Array.from(fastify.io.sockets.sockets.values())
          .filter(s => s.userId === userId);
        fromUserSockets.forEach(s => s.emit('invitation-updated'));
      }
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });

  fastify.post('/leave/:projectId', async (request, reply) => {
    try {
      const projectId = parseInt(request.params.projectId, 10);
      const userId = request.session.userId;

      if (isNaN(projectId) || projectId <= 0) {
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
        
        if (fastify.io && userInvitation.from_user_id) {
          const ownerSockets = Array.from(fastify.io.sockets.sockets.values())
            .filter(s => s.userId === userInvitation.from_user_id);
          ownerSockets.forEach(s => s.emit('invitation-updated'));
        }
      }
      
      return { success: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Server error' });
    }
  });
}

