import { describe, expect, it } from 'vitest';
import { listenAddresses, parseConfig } from '../src/config';

describe('configuration (ADR 0026)', () => {
  it('fills the defaults of a minimal file', () => {
    const config = parseConfig({});
    expect(config.ok && config.value).toMatchObject({
      port: 9620,
      host: '127.0.0.1',
      staleAfterHours: 24,
      database: 'tracker.db',
    });
  });

  it('names the wrong key in plain words', () => {
    const config = parseConfig({ port: 'eighty' });
    expect(config.ok ? '' : config.error).toMatch(/port/);
  });

  it('refuses a Jira token written in the file: only the name of its variable is allowed', () => {
    const config = parseConfig({
      jira: {
        baseUrl: 'https://jira.example.test',
        project: 'DEMO',
        email: 'dev@example.test',
        token: 'secret',
      },
    });
    expect(config.ok).toBe(false);
  });

  it('accepts Jira with the names of the variables that hold the secrets', () => {
    const config = parseConfig({
      jira: {
        baseUrl: 'https://jira.example.test',
        project: 'DEMO',
        emailEnv: 'JIRA_EMAIL',
        tokenEnv: 'JIRA_API_TOKEN',
      },
    });
    expect(config.ok).toBe(true);
  });

  it('takes parent tickets as issue keys only, so that nothing else reaches the Jira query (ADR 0052)', () => {
    const jira = (parents: string[]): boolean =>
      parseConfig({
        jira: {
          baseUrl: 'https://jira.example.test',
          project: 'DEMO',
          emailEnv: 'JIRA_EMAIL',
          tokenEnv: 'JIRA_API_TOKEN',
          parents,
        },
      }).ok;
    expect(jira(['DEMO-10', 'DEMO-20'])).toBe(true);
    expect(jira(['DEMO-10) OR project = OTHER'])).toBe(false);
  });

  it('also takes the parent tickets as one text, comma-separated, as people write it by hand', () => {
    const config = parseConfig({
      jira: {
        baseUrl: 'https://jira.example.test',
        project: 'DEMO',
        emailEnv: 'JIRA_EMAIL',
        tokenEnv: 'JIRA_API_TOKEN',
        parents: 'DEMO-10, demo-20',
      },
    });
    expect(config.ok && config.value.jira?.parents).toEqual(['DEMO-10', 'DEMO-20']);
  });

  it('never listens on every interface', () => {
    const config = parseConfig({ host: '0.0.0.0' });
    expect(config.ok ? '' : config.error).toMatch(/0\.0\.0\.0/);
  });

  it('refuses a host that is neither the loopback nor a declared private address', () => {
    expect(parseConfig({ host: '192.168.1.84' }).ok).toBe(false);
    expect(parseConfig({ host: '100.64.0.2', privateAddresses: ['100.64.0.2'] }).ok).toBe(true);
  });

  it('answers on the loopback names and the declared private addresses only', () => {
    const config = parseConfig({ port: 9700, privateAddresses: ['100.64.0.2'] });
    expect(config.ok && listenAddresses(config.value)).toEqual([
      '127.0.0.1:9700',
      'localhost:9700',
      '[::1]:9700',
      '100.64.0.2:9700',
    ]);
  });
});
