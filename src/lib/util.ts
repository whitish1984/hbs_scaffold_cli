import type { Options } from 'fast-glob';

import fgOriginal from 'fast-glob';
import _ from 'lodash';
import p from 'path';

// A bit terrible workaround... 
// Re-export fast-glob module easily to mock for unit-testing.
/* c8 ignore next */
export const fg = (...args: Parameters<typeof fgOriginal>) => fgOriginal(...args);

/**
 * Get object property as array.
 * @template T
 * @param {Record<string, T>} args
 *    object whose key is string.
 * @param {string} key
 *    property name.
 * @return {T[]} value of the property.
 */
export function getAsArray<T=unknown>(args: Record<string, T>, key: string): T[] {
  switch (typeof args[key]) {
  case ('symbol'):
  case ('function'):
  case ('undefined'):
    return [];
  case ('object'):
    if (Array.isArray(args[key])) {
      return args[key] as T[];
    }
    else return [];
  default:
    return [ args[key] ];
  }
}

/**
 * Get paths resolved by given glob-patterns.
 * The fast-glob module is internally used.
 * 
 * @param {string[]} globPaths
 *    file paths of the target files. able to include globs(*).
 * @param {Options|undefined} options
 *    fast-glob options.
 * @return {Promise<string[]>}
 *    sorted and uniqued list of paths.
 * @throws 
 *  - Error if a path pattern includes `globPath` element is not 
 *    mached any file/directory.
 */
export async function resolveGlobs(globPaths: string[], options?: Options|undefined): Promise<string[]> {
  const outs = await Promise.all(globPaths.map(async (globPath: string) => {
    const globbedPaths = await fg(globPath, options); 
    if (globbedPaths.length === 0) {
      throw exception('RuntimeError', `Path-pattern "${globPath}" is not matched any actual file.`);
    }
    return globbedPaths;
  }));
  return _.uniq(outs.flat()).sort();
}

/**
 * Get the longest common prefix (absolute) path from paths array.
 * 
 * @param {string[]} paths
 *    file paths.
 * @return {string}
 *    the longest common prefix path.
 */
export function getPrefixPath(paths: string[]): string {
  let prefix: string;
  if (paths.length > 0) {
    prefix = p.dirname(p.resolve(paths[0]));
    paths.slice(1).forEach(path => {
      while (prefix !== '/') {
        if (p.resolve(path).startsWith(prefix)) break;
        prefix = p.dirname(prefix);
      }
    });
    return prefix;
  }
  else return '';
}

/**
 * Create new Error and return it.
 * Support function to set Error name easily.
 * 
 * @param {string} name
 *    the error name.
 * @param {string} message
 *    The error message.
 * @return {Error} Error object..
 */
export function exception(name: string, message: string): Error {
  const e = new Error;
  e.name = name;
  e.message = message;
  return e;
}