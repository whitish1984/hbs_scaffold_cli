import type { HelperOptions } from 'handlebars';
import type { Data } from '@/lib/dataOperator';
import type { Helper } from '@/lib/customHelper';
import type { Source } from '@/lib/source';

import fs from 'fs/promises';
import Handlebars from 'handlebars';
import p from 'path';

import { exception } from '@/lib/util';
import { processRegisterHelpersFactory } from '@/lib/customHelper';
import { collectPreloads } from '@/lib/preload';

/** return object for blueprint. */
export interface Blueprint {
  /** Source objects after loading of the blueprints. */
  sources: Data<Source>;
  /** preload paths after loading of the blueprints. */
  preloads: Data<string>;
}

/**
 * Generate source object and preload files from the blueprint.
 * 
 * @param {string} tmplDir
 *    root directory path of the template file.
 * @param {string[]} blueprints
 *    relative paths to the blueprint files from the tmplDir.
 * @param {Data<Helper>} helpersData
 *    cusotm helper Data.
 * @param {Data} inputData
 *    Data object includes input data to generate.
 * @return {Promise<Blueprint>}
 *    return Source object for generation.
 */
export async function loadBlueprints(
  tmplDir: string, 
  blueprints: string[], 
  helpersData: Data<Helper>,
  inputData: Data
): Promise<Blueprint> {
  const sources: Data<Source> = {};
  const preloadPaths: string[] = [];
  await Promise.all(blueprints.map(async blueprint => {
    const bpDir = p.dirname(blueprint);
    if (!p.resolve(bpDir).startsWith(p.resolve(tmplDir))){
      throw exception('RuntimeError',`Blueprint path '${blueprint}' is not located inside the '${tmplDir}'.`);
    }
    const BpHandlebars = Handlebars.create();
    const outputPrefix = p.relative(tmplDir, bpDir);
    await processRegisterHelpersFactory(BpHandlebars)(helpersData);
    registerRenderHelper(BpHandlebars, sources, bpDir, outputPrefix);
    registerPreloadHelper(BpHandlebars, preloadPaths, bpDir);
    BpHandlebars.compile(await fs.readFile(blueprint, 'utf8'))(inputData);
  }));
  return {
    sources: sources,
    preloads: await collectPreloads(preloadPaths)
  } as Blueprint;

}

function registerRenderHelper(
  hbs: typeof Handlebars, 
  sources: Data<Source>, 
  bpDir: string, 
  outputPrefix: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hbs.registerHelper('render', function(this: any, ...args: unknown[]) {
    const options = args.pop() as HelperOptions & {loc: { start: unknown } };
    let outPath: string, template: string;
    switch (true) {
    case (options.fn !== undefined && args.length === 1):
      outPath = p.join(outputPrefix, options.fn(this, options));
      template = p.join(bpDir, args[0] as string);
      break;
    case (options.fn === undefined && args.length === 2):
      outPath = p.join(outputPrefix, args[0] as string);
      template = p.join(bpDir, args[1] as string);
      break;
    default: 
      throw exception('SyntaxError', `Helper 'render' wrongly used at ${JSON.stringify(options.loc.start)}.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    sources[outPath] = {template: template, extraData: options.hash };
  });
}

function registerPreloadHelper(
  hbs: typeof Handlebars, 
  preloads: string[], 
  bpDir: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hbs.registerHelper('preload', function(this: any, ...args: unknown[]) {
    const options = args.pop() as HelperOptions & {loc: { start: unknown } };
    switch (true) {
    case (options.fn !== undefined && args.length === 0):
      preloads.push(p.join(bpDir, options.fn(this, options)));
      break;
    case (options.fn === undefined && args.length === 1):
      preloads.push(p.join(bpDir, args[0] as string));
      break;
    default: 
      throw exception('SyntaxError', `Helper 'preload' wrongly used at ${JSON.stringify(options.loc.start)}.`);
    }
  });
}
