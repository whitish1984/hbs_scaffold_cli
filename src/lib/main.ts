import type { Data } from '@/lib/dataOperator';
import type { Source } from '@/lib/source';

import * as ch from '@/lib/customHelper';
import * as id from '@/lib/inputData';
import * as pl from '@/lib/preload';
import * as sc from '@/lib/source';
import { getDataValues, mergeData } from '@/lib/dataOperator';
import { loadBlueprints } from '@/lib/blueprint';

/**
 * argument object for run function.
 */
export interface Args {
  /** root directory path for the templates. */
  templateDir: string;
  /** root directory for the output files */
  outputDir: string;
  /** paths of handlebars template files. */
  templates?: string[];
  /** paths of handlebars template files. */
  blueprints?: string[];
  /** paths of input data files. */
  inputs?: string[];
  /** paths of preload files. */
  preloads?: string[];
  /** paths of custom helper files. */
  customHelpers?: string[];
}

/**
 * result object returned by run function.
 */
export interface Result {
  /** registered helper function names. */
  registerdHelpers: string[];
  /** input Data object used for the generation. */
  consolidatedData: Data;
  /** paths of output files. */
  generatedFiles: string[];
}

/**
 * Generate files with handlebars template.
 * 
 * @param {Args} args
 *    Args object.
 * 
 * @return {object}
 *    Result object.
 */
export async function run(args: Args): Promise<Result> {

  const usedPaths: string[] = [];

  // import custom helpers
  const helpersData = await ch.collectHelpers(args.customHelpers??[]);
  const registeredHelpers = await ch.processRegisterHelpers(helpersData);
  usedPaths.push(...args.customHelpers??[]);

  // consolidate data.
  const consolidatedData = await id.collectInputData(args.inputs??[]);
  consolidatedData['_env'] = id.naturalCast(process.env);
  usedPaths.push(...args.inputs??[]);

  // collect preloads.
  const preloads = await pl.collectPreloads(args.preloads??[]);
  usedPaths.push(...args.preloads??[]);

  // collect sources.
  const sources = await sc.collectSourcesFactory(args.templateDir)(args.templates??[]);
  usedPaths.push(...args.templates??[]);

  // append preloads and sources from blueprints.
  const result = await loadBlueprints(args.templateDir, args.blueprints??[], helpersData, consolidatedData);
  usedPaths.push(...args.blueprints??[]);
  usedPaths.push(...getDataValues<string>(result.preloads));
  usedPaths.push(...getDataValues<Source>(result.sources).map(val => val.template));
  
  // generated files.
  const generatedFiles = await sc.processSourceFactory(
    args.outputDir, consolidatedData, pl.joinPreloaded(mergeData<string>(preloads, result.preloads)), usedPaths
  )(mergeData<Source>(sources, result.sources));

  return {
    registerdHelpers: registeredHelpers,
    consolidatedData: consolidatedData,
    generatedFiles: generatedFiles  
  };
}
