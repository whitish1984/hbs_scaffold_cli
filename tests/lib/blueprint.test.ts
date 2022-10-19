import { expect, jest, it } from '@jest/globals';
import type { Data } from '@/lib/util';

import { tn, mapperFactory } from '#/testUtil'; 

// test targets
import * as bp from '@/lib/blueprint';
// mock targets.
import fs from 'fs/promises';

describe('loadBlueprint', () => {

  // TEST DATA
  let mockReadFile: jest.Mock<(path:string) => Promise<string>>;
  const data: Data = { a: 'test.txt', b: [{c: 1, d: 2, e: 3}, {f: true, g: false}]};
  const MAP = {
    'path/to/empty.blueprint'          : '',
    'path/to/broken.blueprint'         : '{{#each b as |item|}}{{#each item as |entry|}}{{item}}/{{entry}}/{{/each}}', // missing closure
    'path/to/broken-render1.blueprint' : '{{render}}',                          // no arguments
    'path/to/broken-render2.blueprint' : '{{render \'x\' \'y\' \'z\'}}',        // too match arguments
    'path/to/broken-render3.blueprint' : '{{#render \'y\' \'z\'}}x{{/render}}', // too match arguments
    'path/to/no-render.blueprint'      : '{{#each b as |item|}}{{#each item as |entry|}}{{entry}}.txt{{/each}}{{/each}}',
    'path/to/single1.blueprint'        : '{{render a \'tmpl/test.hbs\' data=b }}',
    'path/to/single2.blueprint'        : '{{#render \'tmpl/test.hbs\' data=@root.b }}{{a}}{{/render}}',
    'path/to/multiple.blueprint'       : `
      {{#each b as |item|}}
        {{#each item as |entry|}}
          {{#render 'tmpl/test.hbs' data=@root.b }}{{entry}}.txt{{/render}}
        {{/each}}
      {{/each}}`
  };

  beforeEach(() => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<(path: string) => Promise<string>>;
    mockReadFile.mockImplementation((path: string) => mapperFactory<string>(MAP)(path));
  });

  it(tn('throws Error', 'if blueprint is not found.'), async () => {
    mockReadFile.mockRestore();
    await expect(bp.loadBlueprint('path/', 'path/to/not-found.blueprint', {}))
      .rejects.toThrow('ENOENT');
  });

  it(tn('throws SyntaxError', 'if blueprint has SyntaxError.'), async () => {
    await expect(bp.loadBlueprint('path/', 'path/to/broken.blueprint', data))
      .rejects.toThrow('Parse error');
  });

  it(tn('throws SyntaxError', 'if render helper wrongly used.'), async () => {
    await expect(bp.loadBlueprint('path/', 'path/to/broken-render1.blueprint', {}))
      .rejects.toHaveProperty('name', 'SyntaxError');
    await expect(bp.loadBlueprint('path/', 'path/to/broken-render2.blueprint', {}))
      .rejects.toHaveProperty('name', 'SyntaxError');
    await expect(bp.loadBlueprint('path/', 'path/to/broken-render3.blueprint', {}))
      .rejects.toHaveProperty('name', 'SyntaxError');
  });

  it(tn('returns empty Data', 'if blueprint is empty.'), async () => {
    const result = bp.loadBlueprint('path/', 'path/to/empty.blueprint', {});
    await expect(result).resolves.toEqual({});
  });

  it(tn('returns empty Data', 'if blueprint doesn\'t contain render helper.'), async () => {
    const result = bp.loadBlueprint('path/', 'path/to/no-render.blueprint', {});
    await expect(result).resolves.toEqual({});
  });

  it(tn('returns Data with a key', 'if blueprint contains a render helper(1).'), async () => {
    const result = bp.loadBlueprint('path/', 'path/to/single1.blueprint', data);
    await expect(result).resolves.toEqual({
      'to/test.txt': { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } }
    });
  });

  it(tn('returns Data with a key', 'if blueprint contains a render helper(2).'), async () => {
    const result = bp.loadBlueprint('path/', 'path/to/single2.blueprint', data);
    await expect(result).resolves.toEqual({
      'to/test.txt': { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } }
    });
  });

  it(tn('returns Data with multiple keys', 'if blueprint file contains multiple render helpers.'), async () => {
    const result = bp.loadBlueprint('path/', 'path/to/multiple.blueprint', data);
    await expect(result).resolves.toEqual({
      'to/1.txt'    : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/2.txt'    : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/3.txt'    : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/true.txt' : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/false.txt': { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } }
    });
  });

});
