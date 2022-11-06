import type { Data } from '@/lib/dataOperator';
import fs from 'fs/promises';

import { collectData } from '@/lib/dataOperator';

/**
 * A data fetcher to preload template.
 * 
 * @param {string} path
 *    a file path of a handlebars template to be preloaded.
 * @return {Promise<Data<string>>}
 *    returns data object for preloaded template strings.
 */
export async function preloadDataFetcher(path: string): Promise<Data<string>> {
  return { [path]: await fs.readFile(path, 'utf8')};
}

/**
 * Collect preloads from paths.
 * 
 * @param {string[]} paths
 *    file paths of a handlebars templates to be preloaded.
 * @return {Promise<Data<string>>}
 *    returns data object for preloaded template strings.
 */
export async function collectPreloads(paths: string[]): Promise<Data<string>> {
  return await collectData<string>(paths, preloadDataFetcher);
}

/**
 * Get a string of all preloads collected and combined
 * 
 * @param {Data<string>} preloads
 *    Data object for preloads.
 * @return {string}
 *    returns a string of all preloads collected and combined.
 */
export function joinPreloaded(preloads: Data<string>): string {
  return Object.entries(preloads).map(entry => entry[1]).join('');
}

