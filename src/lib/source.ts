import type { Data } from '@/lib/dataOperator';
import type { DataFetcher, Processor } from '@/lib/dataOperator';

import fs from 'fs/promises';
import Handlebars from 'handlebars';
import p from 'path';

import { collectData, mergeData, processData } from '@/lib/dataOperator';
import { exception } from '@/lib/util';

/** Source object for generation. */
export interface Source {
  /** paths of handlebars template files. */
  template: string;
  /** extra input Data object used for the generation. */
  extraData: Data;
}

/**
 * A factory of a data fetcher to set output file path. 
 * 
 * @param {string} tmplDir
 *    root directory path of the template file.
 * @return {DataFetcher<Source>}
 *    returns a data fetcher function to calculate output relative path from a tmplPath.
 *    it returns Data object(key: output relative path, value: Source object).
 */
export function sourceDataFetcherFactory(tmplDir: string): DataFetcher<Source> {
  return async (template: string) => {
    if (!(await fs.stat(template)).isFile()) {
      throw exception('RuntimeError',`Template path '${template}' is directory or it may be broken.`);
    }
    if (!p.dirname(p.resolve(template)).startsWith(p.resolve(tmplDir))){
      throw exception('RuntimeError',`Template path '${template}' is not located inside the '${tmplDir}'.`);
    }
    const outBasename = p.basename(template).replace(/(\.hbs|\.handlebars)/i, '');
    if (outBasename === '') {
      throw exception('RuntimeError',`Template file '${template}' become empty file name when .hbs/.handlebars exention is removed.`);
    }
    return {[p.join(p.relative(tmplDir, p.dirname(template)), outBasename)]: {template: template, extraData: {}}};
  };
}

/**
 * A factory of a function to collect Source objects from paths.
 * 
 * @param {string} tmplDir
 *    root directory path of the template file.
 * @return {(paths: string[]) => Promise<Data<Source>>}
 *    returns a function to collect Source objects from paths.
 */
export function collectSourcesFactory(tmplDir: string): (paths: string[]) => Promise<Data<Source>> {
  return (paths: string[]) => collectData<Source>(paths, sourceDataFetcherFactory(tmplDir));
}

/**
 * A factory of a processer to generate an output file
 * from a handlebars template with input data.
 * 
 * @param {string} outDir
 *    root directory path for the output files.
 * @param {Data} inputData
 *    Data object includes input data to generate.
 * @param {string} preloaded
 *    the preloaded template string to be prepend each template. 
 * @param {string[]} usedPaths
 *    paths for any used file (template, input data, custom helper, ...) 
 * @return {Processor<Source>}
 *    returns a processer function to generate output files
 *    with a handlebars template and inputData at outPath.
 *    it returns an output path as the success message.
 */
export function sourceProcesserFactory(
  outDir: string, 
  inputData: Data, 
  preloaded: string, 
  usedPaths: string[]
): Processor<Source> {
  return async (outPath: string, source: Source) => {
    const out = p.join(outDir, outPath);
    if (usedPaths.some(path => p.resolve(path) === p.resolve(out))) {
      return `WARN: generating file '${out}' is overwriting one of input files. file generation is skipped.`;
    }
    const template = preloaded + await fs.readFile(source.template, 'utf8');
    const output = Handlebars.compile(template)(mergeData(inputData, source.extraData));
    if (output.trim().length === 0) {
      return `WARN: generating file '${out}' become empty. file generation is skipped.`;
    }
    await fs.mkdir(p.dirname(out), { recursive: true });
    await fs.writeFile(out, output);
    return out;
  };
}

/**
 * A factory of a function to generate an output files
 * with handlebars templates and input data.
 * 
 * @param {string} outDir
 *    root directory path for the output files.
 * @param {Data} inputData
 *    Data object includes input data to generate.
 * @param {string} preloaded
 *    the preloaded template string to be prepend each template. 
 * @param {string[]} usedPaths
 *    paths for any used file (template, input data, custom helper, ...) 
 * @return {Promise<string[]>}
 *    returns a function to generate an output files with handlebars 
 *    templates and input data.
 */
export function processSourceFactory(
  outDir: string, 
  inputData: Data, 
  preloaded: string, 
  usedPaths: string[]
): (data: Data<Source>) => Promise<string[]> {
  return (data: Data<Source>) => processData<Source>(data, 
    sourceProcesserFactory(outDir, inputData, preloaded, usedPaths));
}