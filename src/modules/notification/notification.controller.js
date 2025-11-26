// ============================================
// FILE: src/utils/notificationHelper.js
// ============================================

import  Notification  from "./notification.model.js";

export const emitMatchNotification = async(io, eventType, matchData) => {
  
  const message = getNotificationMessage(eventType, matchData);

  const newNotification = new Notification({
    type: eventType, // 'MATCH_CREATED', 'MATCH_UPDATED', 'MATCH_DELETED'
    match: matchData,
    message
  });

  const notification = await newNotification.save();

  // Get all player/user IDs from the match
  const userIds = getMatchParticipantIds(matchData);

  // Send notification only to match participants
  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit('match:notification', notification);
  });

};

const getMatchParticipantIds = (matchData) => {
  const userIds = new Set();

  // For single matches - get player IDs
  if (matchData.matchType === 'single' && matchData.players) {
    matchData.players.forEach(player => {
      if (player.userId) {
        const id = player.userId._id || player.userId;
        userIds.add(id.toString());
      }
    });
  }

  // For pair/team matches - get player IDs from teams
  if (['pair', 'team'].includes(matchData.matchType) && matchData.teams) {
    matchData.teams.forEach(team => {
      if (team.players) {
        team.players.forEach(player => {
          if (player.userId) {
            const id = player.userId._id || player.userId;
            userIds.add(id.toString());
          }
        });
      }
    });
  }

  return Array.from(userIds);
};

const getNotificationMessage = (eventType, matchData) => {
  switch (eventType) {
    case 'MATCH_CREATED':
      return `You have been scheduled for a new ${matchData.matchType} match`;
    case 'MATCH_UPDATED':
      return `Your match has been updated - Status: ${matchData.status}`;
    case 'MATCH_DELETED':
      return `Your match has been cancelled`;
    default:
      return 'Match notification';
  }
};