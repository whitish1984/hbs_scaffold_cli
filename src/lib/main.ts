import type { Data, FunctionType } from '@/lib/util';
import type { Source } from '@/lib/dataFetcher';

import * as df from '@/lib/dataFetcher';
import * as pr from '@/lib/processor';
import * as pl from '@/lib/preload';
import { loadBlueprints } from '@/lib/blueprint';
import { naturalCast } from '@/lib/util';

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

  const inputPaths: string[] = [];

  // import custom helpers
  const helpersData: Data<FunctionType> = await df.collectData(args.customHelpers??[], df.helpersDataFetcher);
  const registeredHelpers = await pr.processData(helpersData, pr.registerHelperProcesser);
  inputPaths.push(...args.customHelpers??[]);

  // consolidate data.
  const consolidatedData: Data = await df.collectData(args.inputs??[], df.inputsDataFetcher);
  consolidatedData['_env'] = naturalCast(process.env);
  inputPaths.push(...args.inputs??[]);

  // collect preloads and sources.
  const preloads: string[] = args.preloads??[];
  const sources: Data<Source> = await df.collectData(args.templates??[], 
    df.generateDataFetcherFactory(args.templateDir));
  // append preloads and sources from blueprints.
  await loadBlueprints(sources, preloads, args.templateDir, args.blueprints??[], helpersData, consolidatedData);
  const preloaded = pl.joinPreloaded(await df.collectData(preloads, pl.preloadDataFetcher));
  inputPaths.push(...args.blueprints??[]);
  inputPaths.push(...preloads);
  inputPaths.push(...Object.entries<Source>(sources).map(args => args[1].template));
  
  // generated files.
  const generatedFiles = await pr.processData(sources,
    pr.generateProcesserFactory(args.outputDir, consolidatedData, preloaded, inputPaths));

  return {
    registerdHelpers: registeredHelpers,
    consolidatedData: consolidatedData,
    generatedFiles: generatedFiles  
  };
}
