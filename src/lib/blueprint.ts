import type { HelperOptions } from 'handlebars';
import type { Data } from '@/lib/util';
import type { Source } from '@/lib/dataFetcher';

import fs from 'fs/promises';
import Handlebars from 'handlebars';
import p from 'path';

import { exception } from '@/lib/util';

/**
 * Generate source object from blueprint file.
 * 
 * @param {string} tmplDir
 *    root directory path of the template file.
 * @param {string} blueprint
 *    path to the blueprint file.
 * @param {Data} inputData
 *    Data object includes input data to generate.
 * @return {Promise<Data<Source>}
 *    return Source object for generation.
 */
export async function loadBlueprint(tmplDir: string, blueprint: string, inputData: Data): Promise<Data<Source>> {
  const sources: Data<Source> = {};
  registerGeneratorHelper(sources, tmplDir, p.dirname(blueprint));
  Handlebars.compile(await fs.readFile(blueprint, 'utf8'))(inputData);
  unregisterGeneratorHelper();
  return sources;
}

function registerGeneratorHelper(sources: Data<Source>, tmplDir: string, bpDir: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Handlebars.registerHelper('render', function(this: any, ...args: unknown[]) {
    const options = args.pop() as HelperOptions & {loc: { start: unknown } };
    let outPath: string, template: string;
    const prefixPath = p.relative(tmplDir, bpDir);
    switch (true) {
    case (options.fn !== undefined && args.length === 1):
      outPath = p.join(prefixPath, options.fn(this, options));
      template = p.join(bpDir, args[0] as string);
      break;
    case (options.fn === undefined && args.length === 2):
      outPath = p.join(prefixPath, args[0] as string);
      template = p.join(bpDir, args[1] as string);
      break;
    default: 
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw exception('SyntaxError', `Helper 'render' wrongly used at ${JSON.stringify(options.loc.start)}.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    sources[outPath] = {template: template, extraData: options.hash };
  });
}

function unregisterGeneratorHelper(){
  Handlebars.unregisterHelper('render');
}
