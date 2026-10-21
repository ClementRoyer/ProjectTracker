import { describe, expect, it } from 'vitest';
import {
  withTrackerHooks,
  withTrackerMcp,
  withoutTracker,
} from '../../src/project/claude-settings';

const URL = 'http://127.0.0.1:9620';

describe('the project settings of Claude Code (ADR 0030)', () => {
  it('adds the session start, turn start and end of turn hooks, and the tracker address', () => {
    const settings = withTrackerHooks({}, URL);
    expect(Object.keys(settings.hooks)).toEqual(['SessionStart', 'UserPromptSubmit', 'Stop']);
    expect(JSON.stringify(settings.hooks)).toContain('tools/tracker/app/claude/session-start.js');
    expect(settings.env).toEqual({ TRACKER_URL: URL });
  });

  it('keeps what belongs to the project: its own hooks, permissions and variables', () => {
    const own = {
      permissions: { allow: ['Bash(npm test)'] },
      env: { OTHER: '1' },
      hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }] },
    };
    const settings = withTrackerHooks(own, URL);
    expect(settings.permissions).toEqual(own.permissions);
    expect(settings.env).toEqual({ OTHER: '1', TRACKER_URL: URL });
    expect(JSON.stringify(settings.hooks.Stop)).toContain('echo done');
    expect(JSON.stringify(settings.hooks.Stop)).toContain('stop.js');
  });

  it('adds its hooks once, however many times the install runs', () => {
    const twice = withTrackerHooks(withTrackerHooks({}, URL), 'http://127.0.0.1:9630');
    expect(twice.hooks.Stop).toHaveLength(1);
    expect(twice.env).toEqual({ TRACKER_URL: 'http://127.0.0.1:9630' });
  });

  it('turns off the co-author line of commits and PRs, unless the project set its own (ADR 0043)', () => {
    expect(withTrackerHooks({}, URL).attribution).toEqual({ commit: '', pr: '' });
    const own = { attribution: { commit: 'Reviewed by the team', pr: '' } };
    expect(withTrackerHooks(own, URL).attribution).toEqual(own.attribution);
  });

  it('declares the MCP server in HTTP, beside the project’s other servers', () => {
    const mcp = withTrackerMcp({ mcpServers: { other: { command: 'x' } } }, URL);
    expect(mcp.mcpServers).toEqual({
      other: { command: 'x' },
      tracker: {
        type: 'http',
        url: `${URL}/mcp`,
        headers: { 'x-tracker-channel': 'off' },
      },
    });
  });

  it('takes its hooks and address back out, and leaves the project’s own and the attribution', () => {
    const own = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }] } };
    const removed = withoutTracker(withTrackerHooks(own, URL));
    expect(removed).toEqual({ ...own, attribution: { commit: '', pr: '' } });
  });
});
