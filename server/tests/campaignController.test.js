import assert from 'node:assert/strict';
import test from 'node:test';
import { getCampaign, getCampaigns, getCampaignSession, saveCampaignSession, updateCampaign } from '../controllers/campaignController.js';

const campaign = { id: 42, user_id: 7, name: 'La cité perdue' };
const players = [{ id: 8, email: 'player@example.test', character_name: 'Ariane' }];

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const createDatabase = ({ campaignRows = [campaign], membershipRows = [], playerRows = players } = {}) => {
  const calls = [];
  return {
    calls,
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith('SELECT * FROM campaigns')) return { rows: campaignRows };
      if (sql.startsWith('SELECT 1 FROM campaign_players')) return { rows: membershipRows };
      if (sql.includes('JOIN users u')) return { rows: playerRows };
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
};

test('allows the campaign owner to read campaign details', async () => {
  const database = createDatabase();
  const res = createResponse();

  await getCampaign({ params: { id: '42' }, user: { id: 7 } }, res, database);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.name, campaign.name);
  assert.deepEqual(res.body.players, players);
  assert.equal(database.calls.length, 2);
});

test('allows a registered campaign player to read campaign details', async () => {
  const database = createDatabase({ membershipRows: [{ '?column?': 1 }] });
  const res = createResponse();

  await getCampaign({ params: { id: '42' }, user: { id: 8 } }, res, database);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.players, players);
  assert.equal(database.calls.length, 3);
});

test('does not disclose campaign details to a non-member', async () => {
  const database = createDatabase({ membershipRows: [] });
  const res = createResponse();

  await getCampaign({ params: { id: '42' }, user: { id: 9 } }, res, database);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'Unauthorized' });
  assert.equal(database.calls.length, 2);
});

test('returns not found without querying campaign players', async () => {
  const database = createDatabase({ campaignRows: [] });
  const res = createResponse();

  await getCampaign({ params: { id: '404' }, user: { id: 9 } }, res, database);

  assert.equal(res.statusCode, 404);
  assert.equal(database.calls.length, 1);
});

test('lists owned and shared campaigns with ownership metadata', async () => {
  const rows = [
    { ...campaign, is_owner: true },
    { id: 43, user_id: 6, name: 'La forêt oubliée', is_owner: false }
  ];
  let query;
  const database = {
    async query(sql, values) {
      query = { sql, values };
      return { rows };
    }
  };
  const res = createResponse();

  await getCampaigns({ user: { id: 7 } }, res, database);

  assert.deepEqual(res.body, rows);
  assert.match(query.sql, /campaign_players/);
  assert.deepEqual(query.values, [7]);
});

test('loads a persisted session for an authorized player', async () => {
  const savedSession = { conversation: [{ type: 'user', text: 'Bonjour' }], summary: 'La quête commence', character_sheet: null };
  const database = {
    async query(sql) {
      if (sql.startsWith('SELECT id, user_id FROM campaigns')) return { rows: [{ id: 42, user_id: 7 }] };
      if (sql.startsWith('SELECT 1 FROM campaign_players')) return { rows: [{ '?column?': 1 }] };
      if (sql.startsWith('SELECT conversation, summary')) return { rows: [savedSession] };
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
  const res = createResponse();

  await getCampaignSession({ params: { id: '42' }, user: { id: 8 } }, res, database);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, savedSession);
});

test('does not disclose a persisted session to a non-member', async () => {
  const database = {
    async query(sql) {
      if (sql.startsWith('SELECT id, user_id FROM campaigns')) return { rows: [{ id: 42, user_id: 7 }] };
      if (sql.startsWith('SELECT 1 FROM campaign_players')) return { rows: [] };
      throw new Error(`Session should not be queried: ${sql}`);
    }
  };
  const res = createResponse();

  await getCampaignSession({ params: { id: '42' }, user: { id: 9 } }, res, database);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'Unauthorized' });
});

test('persists session data for an authorized player', async () => {
  const conversation = [{ type: 'user', text: 'Bonjour' }];
  const characterSheet = { name: 'Ariane', level: 1 };
  const savedRow = { conversation, summary: 'La quête commence', character_sheet: characterSheet };
  let saveValues;
  const database = {
    async query(sql, values) {
      if (sql.startsWith('SELECT id, user_id FROM campaigns')) return { rows: [{ id: 42, user_id: 7 }] };
      if (sql.startsWith('SELECT 1 FROM campaign_players')) return { rows: [{ '?column?': 1 }] };
      if (sql.startsWith('INSERT INTO campaign_sessions')) {
        saveValues = values;
        return { rows: [savedRow] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
  const res = createResponse();

  await saveCampaignSession({
    params: { id: '42' },
    user: { id: 8 },
    body: { conversation, summary: 'La quête commence', characterSheet }
  }, res, database);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, savedRow);
  assert.equal(saveValues[2], JSON.stringify(conversation));
  assert.equal(saveValues[4], JSON.stringify(characterSheet));
});

test('only the campaign owner can update campaign data', async () => {
  let updateAttempted = false;
  const database = {
    async query(sql) {
      if (sql.startsWith('SELECT user_id')) return { rows: [{ user_id: 7 }] };
      updateAttempted = true;
      return { rows: [{ ...campaign, name: 'Updated' }] };
    }
  };
  const res = createResponse();

  await updateCampaign({ params: { id: '42' }, user: { id: 8 }, body: { name: 'Updated' } }, res, database);

  assert.equal(res.statusCode, 403);
  assert.equal(updateAttempted, false);
});