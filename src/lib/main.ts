import type { Data } from '@/lib/util';

import * as df from '@/lib/dataFetcher';
import * as pr from '@/lib/processor';
import { naturalCast } from '@/lib/util';

/**
 * argument object for run function.
 */
export interface Args {
  /** paths of handlebars template files. */
  templates: string[];
  /** root directory path for the templates. */
  templateDir: string;
  /** root directory for the output files */
  outputDir: string;
  /** paths of input data files. */
  inputs: string[];
  /** paths of custom helper files. */
  customHelpers: string[];
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

  // import custom helpers
  const registeredHelpers = await pr.processData(
    await df.collectData(args.customHelpers, df.helpersDataFetcher), 
    pr.registerHelperProcesser
  );

  // consolidate data.
  const consolidatedData = await df.collectData(args.inputs, df.inputsDataFetcher);
  consolidatedData['_env'] = naturalCast(process.env);

  // generated files.
  const generatedFiles = await pr.processData(
    await df.collectData(args.templates, df.generateDataFetcherFactory(args.templateDir, consolidatedData)),
    pr.generateProcesserFactory(args.outputDir, consolidatedData)
  );

  return {
    registerdHelpers: registeredHelpers,
    consolidatedData: consolidatedData,
    generatedFiles: generatedFiles  
  };
}
