export async function invitationRoutes(fastify, options) {
  fastify.addHook('preHandler', (request, reply, done) => {
    if (!request.session.userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    done();
  });

  fastify.post('/send', async (request, reply) => {
    const { projectId, username } = request.body;
    const fromUserId = request.session.userId;

    if (!projectId || !username) {
      return reply.code(400).send({ error: 'Invalid request' });
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

    try {
      const result = fastify.db.createInvitation(projectId, fromUserId, toUser.id);
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
      return reply.code(409).send({ error: 'Failed to send invitation' });
    }
  });

  fastify.get('/received', async (request, reply) => {
    const userId = request.session.userId;
    const invitations = fastify.db.getInvitationsByUser(userId);
    return invitations;
  });

  fastify.get('/project/:projectId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const userId = request.session.userId;

    const project = fastify.db.getProject(projectId, userId);
    if (!project) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const invitations = fastify.db.getInvitationsByProject(projectId);
    return invitations;
  });

  fastify.post('/:invitationId/accept', async (request, reply) => {
    const invitationId = parseInt(request.params.invitationId);
    const userId = request.session.userId;

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

    try {
      fastify.db.addCollaborator(invitation.project_id, userId);
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
      return reply.code(500).send({ error: 'Failed to accept invitation' });
    }
  });

  fastify.post('/:invitationId/reject', async (request, reply) => {
    const invitationId = parseInt(request.params.invitationId);
    const userId = request.session.userId;

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
  });

  fastify.get('/collaborators/:projectId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const userId = request.session.userId;

    if (!fastify.db.hasProjectAccess(projectId, userId)) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    const collaborators = fastify.db.getCollaborators(projectId);
    return collaborators;
  });

  fastify.delete('/collaborators/:projectId/:collaboratorId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const collaboratorId = parseInt(request.params.collaboratorId);
    const userId = request.session.userId;

    const project = fastify.db.getProject(projectId, userId);
    if (!project) {
      return reply.code(403).send({ error: 'Only owner can remove collaborators' });
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
      collabSockets.forEach(s => s.emit('invitation-updated'));
      
      const ownerSockets = Array.from(fastify.io.sockets.sockets.values())
        .filter(s => s.userId === userId);
      ownerSockets.forEach(s => s.emit('invitation-updated'));
    }
    
    return { success: true };
  });

  fastify.post('/:invitationId/cancel', async (request, reply) => {
    const invitationId = parseInt(request.params.invitationId);
    const userId = request.session.userId;

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
  });

  fastify.post('/leave/:projectId', async (request, reply) => {
    const projectId = parseInt(request.params.projectId);
    const userId = request.session.userId;

    if (!fastify.db.isCollaborator(projectId, userId)) {
      return reply.code(403).send({ error: 'You are not a collaborator' });
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
  });
}

