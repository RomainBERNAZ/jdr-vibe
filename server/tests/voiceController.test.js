import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTranscribeAndChat } from '../controllers/voiceController.js';

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

const createDatabase = ({ isMember = true, session = null, failOnTurnInsert = false } = {}) => {
  const state = {
    session,
    turns: new Map(),
    lockCount: 0,
    unlockCount: 0,
    releaseCount: 0,
    rollbackCount: 0,
    failOnTurnInsert
  };

  const client = {
    async query(sql, values = []) {
      const query = sql.trim();
      if (query.startsWith('SELECT id, user_id FROM campaigns')) {
        return { rows: [{ id: 42, user_id: 7 }] };
      }
      if (query.startsWith('SELECT 1 FROM campaign_players')) {
        return { rows: isMember ? [{ '?column?': 1 }] : [] };
      }
      if (query.includes('pg_advisory_lock(')) {
        state.lockCount += 1;
        return { rows: [] };
      }
      if (query.includes('pg_advisory_unlock(')) {
        state.unlockCount += 1;
        return { rows: [] };
      }
      if (query.startsWith('SELECT request_hash, response')) {
        const turn = state.turns.get(`${values[0]}:${values[1]}:${values[2]}`);
        return { rows: turn ? [turn] : [] };
      }
      if (query.startsWith('SELECT conversation, summary, character_sheet FROM campaign_sessions')) {
        return { rows: state.session ? [state.session] : [] };
      }
      if (query === 'BEGIN' || query === 'COMMIT') return { rows: [] };
      if (query === 'ROLLBACK') {
        state.rollbackCount += 1;
        return { rows: [] };
      }
      if (query.startsWith('INSERT INTO campaign_sessions')) {
        state.session = {
          conversation: JSON.parse(values[2]),
          summary: values[3],
          character_sheet: values[4] === null ? null : JSON.parse(values[4])
        };
        return { rows: [state.session] };
      }
      if (query.startsWith('INSERT INTO campaign_turns')) {
        if (state.failOnTurnInsert) throw new Error('turn insert failed');
        state.turns.set(`${values[0]}:${values[1]}:${values[2]}`, {
          request_hash: values[3],
          response: JSON.parse(values[4])
        });
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${query}`);
    },
    release() {
      state.releaseCount += 1;
    }
  };

  return {
    state,
    database: { connect: async () => client }
  };
};

const createOpenAI = ({ failNarration = false } = {}) => {
  const calls = { transcriptions: 0, prompts: [] };
  const client = {
    audio: {
      transcriptions: {
        async create({ file }) {
          calls.transcriptions += 1;
          await new Promise((resolve, reject) => {
            file.once('error', reject);
            file.once('end', resolve);
            file.resume();
          });
          return { text: 'Je demande des nouvelles du marchand.' };
        }
      }
    },
    chat: {
      completions: {
        async create(options) {
          calls.prompts.push(options);
          if (failNarration) throw new Error('Narration indisponible');
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  text: 'Le marchand se souvient de votre promesse.',
                  characterSheet: { name: 'Ariane', level: 1 },
                  diceRoll: { type: 'd20', count: 1 }
                })
              }
            }]
          };
        }
      }
    }
  };
  return { calls, client };
};

const createRequest = async (testContext, { turnId, audio = 'same audio', userId = 7 } = {}) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-voice-test-'));
  testContext.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'recording.webm');
  await fs.writeFile(filePath, audio);
  return {
    file: { path: filePath },
    body: {
      campaignId: 42,
      turnId: turnId || '9b7d2f4e-0e14-4c54-9ba7-11a9dc7e0581'
    },
    user: { id: userId }
  };
};

test('loads and saves the campaign session on the server before returning a voice turn', async (testContext) => {
  const savedSession = {
    conversation: [{ type: 'user', text: 'Bonjour au marchand.' }, { type: 'ai', text: 'Il vous salue.' }],
    summary: 'Le groupe a rencontré le marchand.',
    character_sheet: { name: 'Ariane', level: 1 }
  };
  const { database, state } = createDatabase({ session: savedSession });
  const { client: openAIClient, calls } = createOpenAI();
  const controller = createTranscribeAndChat({ database, getOpenAIClient: () => openAIClient });
  const req = await createRequest(testContext);
  const res = createResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.newSummary, savedSession.summary);
  assert.deepEqual(res.body.conversation.slice(0, 2), savedSession.conversation);
  assert.equal(res.body.conversation.length, 4);
  assert.equal(res.body.characterSheet.name, 'Ariane');
  assert.deepEqual(res.body.diceRoll, { type: 'd20', count: 1 });
  assert.equal(calls.transcriptions, 1);
  assert.match(calls.prompts[0].messages[0].content, /Le groupe a rencontré le marchand/);
  assert.equal(state.turns.size, 1);
  assert.equal(state.lockCount, 1);
  assert.equal(state.unlockCount, 1);
  assert.equal(state.releaseCount, 1);
});

test('replays a completed turn without calling OpenAI twice', async (testContext) => {
  const { database, state } = createDatabase();
  const { client: openAIClient, calls } = createOpenAI();
  const controller = createTranscribeAndChat({ database, getOpenAIClient: () => openAIClient });
  const firstRequest = await createRequest(testContext);
  const firstResponse = createResponse();
  await controller(firstRequest, firstResponse);

  const retryRequest = await createRequest(testContext);
  const retryResponse = createResponse();
  await controller(retryRequest, retryResponse);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(retryResponse.statusCode, 200);
  assert.deepEqual(retryResponse.body, firstResponse.body);
  assert.equal(calls.transcriptions, 1);
  assert.equal(calls.prompts.length, 1);
  assert.equal(state.turns.size, 1);
  assert.equal(state.unlockCount, 2);
});

test('rejects reusing a turn id for different audio', async (testContext) => {
  const { database } = createDatabase();
  const { client: openAIClient, calls } = createOpenAI();
  const controller = createTranscribeAndChat({ database, getOpenAIClient: () => openAIClient });
  await controller(await createRequest(testContext), createResponse());

  const conflictingRequest = await createRequest(testContext, { audio: 'different audio' });
  const response = createResponse();
  await controller(conflictingRequest, response);

  assert.equal(response.statusCode, 409);
  assert.equal(calls.transcriptions, 1);
});

test('does not process a voice turn for a non-member', async (testContext) => {
  const { database, state } = createDatabase({ isMember: false });
  const { client: openAIClient, calls } = createOpenAI();
  const controller = createTranscribeAndChat({ database, getOpenAIClient: () => openAIClient });
  const response = createResponse();

  await controller(await createRequest(testContext, { userId: 8 }), response);

  assert.equal(response.statusCode, 403);
  assert.equal(calls.transcriptions, 0);
  assert.equal(state.lockCount, 0);
  assert.equal(state.releaseCount, 1);
});

test('does not persist a turn when narration fails', async (testContext) => {
  const { database, state } = createDatabase();
  const { client: openAIClient } = createOpenAI({ failNarration: true });
  const controller = createTranscribeAndChat({ database, getOpenAIClient: () => openAIClient });
  const response = createResponse();

  await controller(await createRequest(testContext), response);

  assert.equal(response.statusCode, 500);
  assert.equal(state.session, null);
  assert.equal(state.turns.size, 0);
  assert.equal(state.unlockCount, 1);
});
