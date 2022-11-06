import type { Data } from '@/lib/dataOperator';

import fs from 'fs/promises';
import yaml from 'js-yaml';
import _ from 'lodash';

import { collectData } from '@/lib/dataOperator';

/**
 * A data fetcher for the input data loaded from a json/yaml file.
 * 
 * @param {string} path
 *    a file path of a data file(json/yaml).
 * @return {Promise<Data>}
 *    returns a Data object includes input data.
 * @throws 
 *  - SyntaxError if the input file(json/yaml) is invalid syntax.
 */
export async function inputsDataFetcher(path: string): Promise<Data> {
  try {
    // yaml.load is able to import both yaml and json.
    const content = await fs.readFile(path, 'utf8');
    return _.isEmpty(content)?{}:yaml.load(content) as Data;
  }
  catch (e: unknown) {
    if (e instanceof Error && e.name === 'YAMLException') {
      // Overwrite error name `YAMLException` 
      // because this exception covers both YAML's and JSON's.
      e.name = 'SyntaxError';
    }
    throw e;
  }
}

/**
 * Collect input data from paths.
 * 
 * @param {string[]} paths
 *    file paths of data files(json/yaml).
 * @return {Promise<Data>}
 *    returns Data object includes input data. 
 */
export async function collectInputData(paths: string[]): Promise<Data> {
  return await collectData(paths, inputsDataFetcher);
}

/**
 * Cast string values in Data object natually.
 * 
 * @param {Data} data
 *    any object whose key is string.
 * @return {Data}
 *    returns casted Data object.
 */
export function naturalCast(data: Data): Data {
  return Object.fromEntries(Object.entries(data).map(entry => {
    if (typeof entry[1] === 'string')
      try {
        entry[1] = JSON.parse(entry[1]);
      }
      catch{
        // Do nothing -> set the string as it is.
      } 
    else if (entry[1] !== null && typeof entry[1] === 'object' 
        && entry[1].constructor.name === 'Object') {
      entry[1] = naturalCast(entry[1] as Data);
    }
    return entry;
  })) as Data;
}