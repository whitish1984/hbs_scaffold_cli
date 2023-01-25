import type { Data } from '@/lib/dataOperator';

import Handlebars from 'handlebars';
import p from 'path';

import { collectData, processData, Processor } from '@/lib/dataOperator';

/** Utilty type for any function to use custom helper. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare type Helper = (...args: any[]) => any;

/**
 * A data fetcher for custom helpers loaded from a js file.
 * 
 * @param {string} path 
 *    file path of the js file.
 * @return {Promise<Data<Helper>>}
 *    Data object includes helper functions. 
 * @throws 
 *  - Error if the file doesn't exist.
 */
export async function helpersDataFetcher(path: string): Promise<Data<Helper>> {
  const helperEntries = Object.entries(await import(p.resolve(path)) as Data )
    .filter((entry) => typeof entry[1] === 'function' ) as [string, Helper][];
  return Object.fromEntries(helperEntries);
}

/**
 * Collect custom helpers from paths.
 * 
 * @param {string[]} paths
 *    file path of the js file.
 * @return {Promise<Data<HelperType>>}
 *    Data object includes helper functions. 
 */
export function collectHelpers(paths: string[]): Promise<Data<Helper>> {
  return collectData<Helper>(paths, helpersDataFetcher);
}

/**
 * A factory of a processor to register a custom Handlebars helper.
 * 
 * @param {Handlebars} hbs
 *    Handlebars object to be registerred to.
 * @return {Processor<Helper>}
 *    returns a processer function to register custom helper.
 */
export function registerHelperProcesserFactory(hbs: typeof Handlebars): Processor<Helper> {
  return (fnName: string, fn: Helper) => {
    hbs.registerHelper(fnName, fn);
    return Promise.resolve(fnName);
  };
}

/**
 * A factory of a function to register custom Handlebars helpers.
 * 
 * @param {Handlebars} hbs
 *    Handlebars object to be registerred to.
 * @return {(data: Data<Helper>) => Promise<string[]>}
 *    returns a function to register custom helpers.
 */
export function processRegisterHelpersFactory(hbs: typeof Handlebars): (data: Data<Helper>) => Promise<string[]> {
  return (data: Data<Helper>) => processData<Helper>(data, registerHelperProcesserFactory(hbs));
}

/**
 * Register custom Handlebars helpers.
 * 
 * @param {Data<Helper>} data
 *    data object for helper functions. 
 * @return {Promise<string[]>}
 *    return registerd helper names as the resulting message.
 */
export const processRegisterHelpers = processRegisterHelpersFactory(Handlebars);
