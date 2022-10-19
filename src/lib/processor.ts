import type { Data, FunctionType } from '@/lib/util';
import type { Source } from '@/lib/dataFetcher';

import fs from 'fs/promises';
import Handlebars from 'handlebars';
import p from 'path';

import { getInputPaths } from '@/lib/dataFetcher';
import { mergeData } from '@/lib/util';

/**
 * Execute callback functions for each Data entries.
 * 
 * @param {Data} data 
 *    Data object to be processed.
 * @param {(key: string, value: any) => Promise<string>} processer
 *    callback function to process each Data entries.
 *    its arguments are key-value pair of each entry.
 *    it returns a text as the resulting message.
 * @return {Promise<string[]>}
 *    list of the resulting messages.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function processData(data: Data<any>, processer: (key: string, value: any ) => Promise<string>): Promise<string[]> {
  return await Promise.all(Object.entries(data).map(async entry => 
    await processer(entry[0], entry[1]) // return messages for logging purpose.
  ));
}

/**
 * Register a custom Handlebars helper.
 * 
 * @param {string} fnName
 *    name of a helper function. 
 *    assume to generate via importHelper function.
 * @param {FunctionType} fn
 *    a function object to be registered.
 *    assume to generate via importHelper function.
 * @return {Promise<string>}
 *    registerd helper name as the resulting message.
 */
export function registerHelperProcesser(fnName: string, fn: FunctionType): Promise<string> {
  Handlebars.registerHelper(fnName, fn);
  return Promise.resolve(fnName); //
}

/**
 * Factory of the processer to generate output file 
 * from a handlebars template with input data.
 * 
 * @param {string} outDir
 *    root directory path for the output files.
 * @param {Data} inputData
 *    Data object includes input data to generate.
 * @return {(outPath: string, tmplPath: string) => Promise<string>}
 *    The processer to generate output files at outPath
 *    from a handlebars template with inputData.
 *    it returns outPath as the success message.
 */
export function generateProcesserFactory(outDir: string, inputData: Data): 
    (outPath: string, source: Source) => Promise<string> {
  return async (outPath: string, source: Source) => {
    const out = p.join(outDir, outPath);
    if (getInputPaths().some(item => p.resolve(item) === p.resolve(out))) {
      return `WARN: generating file '${out}' is overwriting one of input files. file generation is skipped.`;
    }
    const output = Handlebars.compile(await fs.readFile(source.template, 'utf8'))(mergeData(inputData, source.extraData));
    if (output.trim().length === 0) {
      return `WARN: generating file '${out}' become empty. file generation is skipped.`;
    }
    await fs.mkdir(p.dirname(out), { recursive: true });
    await fs.writeFile(out, output);
    return out;
  };
}
