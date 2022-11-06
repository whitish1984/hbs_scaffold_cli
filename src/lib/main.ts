import type { Data } from '@/lib/dataOperator';
import type { Source } from '@/lib/source';

import * as hlp from '@/lib/customHelper';
import * as ind from '@/lib/inputData';
import * as prl from '@/lib/preload';
import * as src from '@/lib/source';
import { getValues } from '@/lib/dataOperator';
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
  const helpersData = await hlp.collectHelpers(args.customHelpers??[]);
  const registeredHelpers = await hlp.processRegisterHelpers(helpersData);
  usedPaths.push(...args.customHelpers??[]);

  // consolidate data.
  const consolidatedData = await ind.collectInputData(args.inputs??[]);
  consolidatedData['_env'] = ind.naturalCast(process.env);
  usedPaths.push(...args.inputs??[]);

  // collect preloads and sources.
  const preloads = await prl.collectPreloads(args.preloads??[]);
  const sources = await src.collectSourcesFactory(args.templateDir)(args.templates??[]);
  // append preloads and sources from blueprints.
  await loadBlueprints(
    sources, preloads, args.templateDir, args.blueprints??[], helpersData, consolidatedData);
  usedPaths.push(...args.blueprints??[]);
  usedPaths.push(...getValues<string>(preloads));
  usedPaths.push(...getValues<Source>(sources).map(val => val.template));
  
  // generated files.
  const generatedFiles = await src.processSourceFactory(
    args.outputDir, consolidatedData, prl.joinPreloaded(preloads), usedPaths
  )(sources);

  return {
    registerdHelpers: registeredHelpers,
    consolidatedData: consolidatedData,
    generatedFiles: generatedFiles  
  };
}
