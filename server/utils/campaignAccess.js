export const isCampaignOwner = (ownerId, userId) => Number(ownerId) === Number(userId);

export const canAccessCampaign = async (database, campaignId, userId, ownerId) => {
  if (isCampaignOwner(ownerId, userId)) return true;
  const membership = await database.query(
    'SELECT 1 FROM campaign_players WHERE campaign_id = $1 AND user_id = $2',
    [campaignId, userId]
  );
  return membership.rows.length > 0;
};
