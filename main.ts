// Starfall Pact — hand-in program (Node 22, standard library only).
// Copies this repository's game/ and screenshots/ beside this file to /output
// and writes /output/dossier.json with the vendored make.fun library, so the
// sealed scorer can check the game and the AI judge can read its dossier.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The program only ever writes inside the output directory; it never removes
// the output directory itself (the grader mounts it) — it clears at most the
// stale entries it is about to replace, one by one.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// Clear only the contents the hand-in owns (game/, screenshots/, dossier.json),
// never the output directory itself.
for (const name of ['game', 'screenshots', 'dossier.json']) {
  const target = join(out, name);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files, or a
// path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const shots = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).filter((f) => statSync(join(out, 'screenshots', f)).isFile())
  : [];
console.log(`Starfall Pact handed in: ${shots.length} screenshot(s), dossier written to ${join(out, 'dossier.json')}`);
