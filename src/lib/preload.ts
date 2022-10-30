import fs from 'fs/promises';

// PRELOADS is initialized only once at the first time of import,
// even if the module imported multiple times.
// Instead, initPreloads could manually be triggerred if required.
let PRELOADS: string[];
initPreloads();

/**
 * Reset the preloads (Set empty). 
 */
export function initPreloads() {
  PRELOADS = [];
}

/**
 * Get prelaods data.
 * 
 * @return { string } 
 *    collected unique paths.
 */
export function getPreload(): string {
  return PRELOADS.join('');
}

/**
 * set preload template contents.
 * 
 * Please refer to the project README.md
 * describes how to use preload. 
 * 
 * @param {string[]} paths 
 *    handelbars file path to be preloaded.
 */
export async function setPreloads(paths: string[]) {
  return Promise.all(paths.map(async path => 
    PRELOADS.push(await fs.readFile(path, 'utf8'))
  ));
}

