/** Unit tests for the MCP addons tools. */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

const { testDb, dbMock } = vi.hoisted(() => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  const mock = {
    db,
    closeDb: () => {},
    reinitialize: () => {},
    getPlaceWithTags: () => null,
    canAccessTrip: (tripId: any, userId: number) =>
      db.prepare(`SELECT t.id, t.user_id FROM trips t LEFT JOIN trip_members m ON m.trip_id = t.id AND m.user_id = ? WHERE t.id = ? AND (t.user_id = ? OR m.user_id IS NOT NULL)`).get(userId, tripId, userId),
    isOwner: (tripId: any, userId: number) =>
      !!db.prepare('SELECT id FROM trips WHERE id = ? AND user_id = ?').get(tripId, userId),
  };
  return { testDb: db, dbMock: mock };
});

vi.mock('../../../src/db/database', () => dbMock);
vi.mock('../../../src/config', () => ({
  JWT_SECRET: 'test-jwt-secret-for-trek-testing-only',
  ENCRYPTION_KEY: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2',
  updateJwtSecret: () => {},
}));

const { broadcastMock } = vi.hoisted(() => ({ broadcastMock: vi.fn() }));
vi.mock('../../../src/websocket', () => ({ broadcast: broadcastMock }));

import { createTables } from '../../../src/db/schema';
import { runMigrations } from '../../../src/db/migrations';
import { resetTestDb, setAddonEnabled } from '../../helpers/test-db';
import { createUser } from '../../helpers/factories';
import { createMcpHarness, parseToolResult, type McpHarness } from '../../helpers/mcp-harness';
import { AddonsService } from '../../../src/nest/addons/addons.service';
import { DatabaseService } from '../../../src/nest/database/database.service';
import { ADDON_IDS } from '../../../src/addons';

interface AddonEntry {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}
interface AddonsPayload {
  addons: AddonEntry[];
  collabFeatures: { chat: boolean; notes: boolean; polls: boolean; whatsnext: boolean };
  bagTracking: boolean;
}

beforeAll(() => {
  createTables(testDb);
  runMigrations(testDb);
});

beforeEach(() => {
  resetTestDb(testDb);
  broadcastMock.mockClear();
  delete process.env.DEMO_MODE;
  // resetTestDb leaves the addons table alone, so a case that flips a toggle
  // would otherwise leak into the next one.
  for (const id of [ADDON_IDS.BUDGET, ADDON_IDS.PACKING, ADDON_IDS.COLLAB]) {
    setAddonEnabled(testDb, id, true);
  }
});

afterAll(() => {
  testDb.close();
});

async function withHarness(
  userId: number,
  fn: (h: McpHarness) => Promise<void>,
  scopes?: string[] | null,
) {
  const h = await createMcpHarness({ userId, withResources: false, scopes: scopes ?? null });
  try { await fn(h); } finally { await h.cleanup(); }
}

// ---------------------------------------------------------------------------
// list_addons
// ---------------------------------------------------------------------------

describe('Tool: list_addons', () => {
  it('lists the enabled addons with the collab sub-features and bag tracking', async () => {
    const { user } = createUser(testDb);
    const row = testDb.prepare('SELECT name, type FROM addons WHERE id = ?').get('budget') as {
      name: string;
      type: string;
    };
    await withHarness(user.id, async (h) => {
      const result = await h.client.callTool({ name: 'list_addons', arguments: {} });
      expect(result.isError).toBeFalsy();
      const data = parseToolResult(result) as AddonsPayload;
      // The whole entry, so the admin-panel chrome (icon, plus config and fields
      // on a photo provider) has to be absent rather than merely unasserted.
      expect(data.addons).toContainEqual({
        id: 'budget',
        name: row.name,
        type: row.type,
        enabled: true,
      });
      expect(data.collabFeatures).toEqual({ chat: true, notes: true, links: true, polls: true, whatsnext: true });
      expect(data.bagTracking).toBe(false);
    });
  });

  it('lists the enabled photo providers alongside the addons', async () => {
    const { user } = createUser(testDb);
    // Providers ride the journey addon now; migration 84 seeds it off.
    setAddonEnabled(testDb, ADDON_IDS.JOURNEY, true);
    const row = testDb.prepare('SELECT name FROM photo_providers WHERE id = ?').get('immich') as {
      name: string;
    };
    await withHarness(user.id, async (h) => {
      const result = await h.client.callTool({ name: 'list_addons', arguments: {} });
      const data = parseToolResult(result) as AddonsPayload;
      expect(data.addons).toContainEqual({
        id: 'immich',
        name: row.name,
        type: 'photo_provider',
        enabled: true,
      });
    });
  });

  it('drops an addon the admin switched off, so absence means disabled', async () => {
    setAddonEnabled(testDb, ADDON_IDS.BUDGET, false);
    const { user } = createUser(testDb);
    await withHarness(user.id, async (h) => {
      const result = await h.client.callTool({ name: 'list_addons', arguments: {} });
      const data = parseToolResult(result) as AddonsPayload;
      const ids = data.addons.map((a) => a.id);
      expect(ids).not.toContain(ADDON_IDS.BUDGET);
      expect(ids).toContain(ADDON_IDS.PACKING);
    });
  });

  it('follows a collab sub-feature the admin toggles, in both directions', async () => {
    // Written through the same service the admin panel writes through rather
    // than through a hand-rolled app_settings row, so the tool is checked
    // against the real writer and not against a restatement of it.
    const addonsService = new AddonsService(new DatabaseService(testDb));
    const { user } = createUser(testDb);
    await withHarness(user.id, async (h) => {
      addonsService.updateCollabFeatures({ polls: false });
      const off = parseToolResult(
        await h.client.callTool({ name: 'list_addons', arguments: {} }),
      ) as AddonsPayload;
      expect(off.collabFeatures.polls).toBe(false);
      expect(off.collabFeatures.chat).toBe(true);

      addonsService.updateCollabFeatures({ polls: true });
      const on = parseToolResult(
        await h.client.callTool({ name: 'list_addons', arguments: {} }),
      ) as AddonsPayload;
      expect(on.collabFeatures.polls).toBe(true);
    });
  });

  it('reports bag tracking once it is switched on', async () => {
    testDb
      .prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('bag_tracking_enabled', 'true')")
      .run();
    const { user } = createUser(testDb);
    await withHarness(user.id, async (h) => {
      const result = await h.client.callTool({ name: 'list_addons', arguments: {} });
      const data = parseToolResult(result) as AddonsPayload;
      expect(data.bagTracking).toBe(true);
    });
  });

  it('stays registered for a token holding an unrelated scope', async () => {
    const { user } = createUser(testDb);
    await withHarness(user.id, async (h) => {
      const names = (await h.client.listTools()).tools.map((t) => t.name);
      expect(names).toContain('list_addons');
      const result = await h.client.callTool({ name: 'list_addons', arguments: {} });
      expect(result.isError).toBeFalsy();
    }, ['weather:read']);
  });

  it('serves a demo account, the way the authenticated REST route does', async () => {
    process.env.DEMO_MODE = 'true';
    const { user } = createUser(testDb, { email: 'demo@trek.app' });
    await withHarness(user.id, async (h) => {
      const result = await h.client.callTool({ name: 'list_addons', arguments: {} });
      expect(result.isError).toBeFalsy();
      const data = parseToolResult(result) as AddonsPayload;
      expect(data.addons.map((a) => a.id)).toContain(ADDON_IDS.PACKING);
    });
  });
});
