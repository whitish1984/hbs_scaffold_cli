import type { Data } from '@/lib/util';
import fs from 'fs/promises';

/**
 * Get prelaods data.
 * 
 * @return { string } 
 *    collected unique paths.
 */
export async function preloadDataFetcher(preload: string): Promise<Data<string>> {
  return { [preload]: await fs.readFile(preload, 'utf8')};
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
export function joinPreloaded(paths: Data<string>) {
  return Object.entries(paths).map(entry => entry[1]).join('');
}

