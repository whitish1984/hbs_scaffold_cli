import type { Data, FunctionType } from '@/lib/util';

import fs from 'fs/promises';
import yaml from 'js-yaml';
import _ from 'lodash';
import p from 'path';

import { loadBlueprint } from './blueprint';
import { mergeData, exception } from '@/lib/util';


/** Source object for generation. */
export interface Source {
  /** paths of handlebars template files. */
  template: string,
  /** extra input Data object used for the generation. */
  extraData: Data,
}

// INPUT_PATHS is initialized only once at the first time of import,
// even if the module imported multiple times.
// Instead, initInputPaths could manually be triggerred if required.
let INPUT_PATHS: string[];
initInputPaths();

/**
 * Reset the input path records (Set empty). 
 * input path records: all paths executed by collectData function.
 */
export function initInputPaths() {
  INPUT_PATHS = [];
}

/**
 * Get input path records.
 * input path records: all paths executed by collectData function.
 * 
 * @return {string[]} 
 *    collected unique paths.
 */
export function getInputPaths(): string[] {
  return INPUT_PATHS.sort();
}

/**
 * Collect Data object from callback functions
 * which have the path argument.
 * 
 * @param {string[]} paths
 *    file paths of the target files.
 * @param {(string) => Promise<Data>} dataFetcher
 *    callback function to load data form a path.
 * @return {Promise<Data>} 
 *    Consolidated Data object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function collectData(paths: string[], dataFetcher: (path: string) => Promise<Data<any>>): ReturnType<typeof dataFetcher> {
  const items = await Promise.all(paths.map(async (path: string) => await dataFetcher(path)));
  INPUT_PATHS = _.uniq([...INPUT_PATHS, ...paths]);
  let base: Data = {};
  items.forEach((item: Data) => 
    base = mergeData(base, item)
  );
  return base;
}

/**
 * Data fetcher for custom helpers loaded from a js file.
 * 
 * Please refer to the project README.md
 * describes how to create the custom helpers. 
 * 
 * @param {string} path 
 *    file path of the js file.
 * @return {Promise<Data<FunctionType>}
 *    Data object includes helper functions. 
 * @throws 
 *  - Error if no avaliable function includes in the path 
 *    or the file doesn't exist.
 */
export async function helpersDataFetcher(path: string): Promise<Data<FunctionType>> {
  const helperEntries = Object.entries(await import(p.resolve(path)) as Data )
    .filter((entry) => typeof entry[1] === 'function' ) as [string, FunctionType][];
  return Object.fromEntries(helperEntries);
}

/**
 * Data fetcher for the input data loaded from a json/yaml file.
 * 
 * @param {string} path
 *    file path of the data file(json/yaml).
 * @return {Promise<Data>}
 *    Data object includes input data.
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
 * Factory of the data fetcher to calculate output file path. 
 * 
 * @param {string} tmplDir
 *    root directory path of the template file.
 * @param {Data} inputData
 *    Data object includes input data to generate.
 * @return {(template: string) => Promise<Data<Source>>}
 *    The data fetcher to calculate output relative path from a tmplPath.
 *    it returns Data object(key: output relative path, value: Source object).
 */
export function generateDataFetcherFactory(tmplDir: string, inputData: Data): 
    (template: string) => Promise<Data<Source>> {
  return async (template: string) => {
    if (!(await fs.stat(template)).isFile()) {
      throw exception('RuntimeError',`Template path '${template}' is directory or it may be broken.`);
    }
    if (!p.dirname(p.resolve(template)).startsWith(p.resolve(tmplDir))){
      throw exception('RuntimeError',`Template path '${template}' is not located inside the '${tmplDir}'.`);
    }
    if (p.basename(template) === '.blueprint') {
      return loadBlueprint(tmplDir, template, inputData);
    }
    // if the object located at tmplPath is file.
    const outBasename = p.basename(template).replace(/(\.hbs|\.handlebars)/i, '');
    if (outBasename === '') {
      throw exception('RuntimeError',`Template file '${template}' become empty file name when .hbs/.handlebars exention is removed.`);
    }
    return {[p.join(p.relative(tmplDir, p.dirname(template)), outBasename)]: {template: template, extraData: {}}};
  };
}
