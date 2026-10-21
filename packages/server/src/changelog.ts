import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { ChangelogSection } from '@project-tracker/core/usecases';

/** Adds a delivery to the changelog: the newest first, under the file's title (ADR 0037). */
export function withSection(existing: string | null, section: ChangelogSection): string {
  const block = [
    `## ${section.name} (${section.at.slice(0, 10)})`,
    '',
    ...section.lines.map(({ key, line }) => `- ${key} : ${line}`),
    '',
  ].join('\n');
  if (existing === null) return `# Changelog\n\n${block}`;
  const title = /^# .*\n+/.exec(existing);
  if (!title) return `${block}\n${existing}`;
  return `${title[0]}${block}\n${existing.slice(title[0].length)}`;
}

/** Writes each delivery into the project's changelog file. */
export function changelogFile(file: string): { append: (section: ChangelogSection) => void } {
  return {
    append: (section) => {
      writeFileSync(
        file,
        withSection(existsSync(file) ? readFileSync(file, 'utf8') : null, section),
      );
    },
  };
}
