import { expect, jest, it } from '@jest/globals';
import type { Data } from '@/lib/dataOperator';

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
    'path/to/empty.blueprint'            : '',
    'path/to/broken.blueprint'           : '{{#each b as |item|}}{{#each item as |entry|}}{{item}}/{{entry}}/{{/each}}', // missing closure
    'path/to/broken-render1.blueprint'   : '{{render}}', // no arguments
    'path/to/broken-render2.blueprint'   : '{{render \'x\' \'y\' \'z\'}}', // too match arguments
    'path/to/broken-render3.blueprint'   : '{{#render \'y\' \'z\'}}x{{/render}}', // too match arguments
    'path/to/broken-preload1.blueprint'  : '{{preload}}', // no arguments
    'path/to/broken-preload2.blueprint'  : '{{preload \'x\' \'y\' }}', // too match arguments
    'path/to/broken-preload3.blueprint'  : '{{#preload \'y\'}}x{{/preload}}', // too match arguments
    'path/to/null.blueprint'             : '{{#each b as |item|}}{{#each item as |entry|}}{{entry}}.txt{{/each}}{{/each}}',
    'path/to/single-render1.blueprint'   : '{{render a \'tmpl/test.hbs\' data=b }}',
    'path/to/single-render2.blueprint'   : '{{#render \'tmpl/test.hbs\' data=@root.b }}{{a}}{{/render}}',
    'path/to/single-preload1.blueprint'  : '{{preload a}}',
    'path/to/single-preload2.blueprint'  : '{{#preload}}{{a}}{{/preload}}',
    'path/to/test.txt'                   : '// preloaded.',
    'path/to/1.txt'                      : '// 1.',
    'path/to/2.txt'                      : '// 2.',
    'path/to/3.txt'                      : '// 3.',
    'path/to/true.txt'                   : '// true.',
    'path/to/false.txt'                  : '// false.',
    'path/to/multiple-render.blueprint'  : `
      {{#each b as |item|}}
        {{#each item as |entry|}}
          {{#render 'tmpl/test.hbs' data=@root.b }}{{entry}}.txt{{/render}}
        {{/each}}
      {{/each}}`,
    'path/to/multiple-preload.blueprint' : `
      {{#each b as |item|}}
        {{#each item as |entry|}}
          {{#preload}}{{entry}}.txt{{/preload}}
        {{/each}}
      {{/each}}`
  };

  beforeEach(() => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<(path: string) => Promise<string>>;
    mockReadFile.mockImplementation((path: string) => mapperFactory<string>(MAP)(path));
  });

  it(tn('throws Error', 'if blueprint is not found.'), async () => {
    mockReadFile.mockRestore();
    await expect(bp.loadBlueprints('path/', ['path/to/not-found.blueprint'], {}, {}))
      .rejects.toThrow('ENOENT');
  });

  it(tn('throws SyntaxError', 'if blueprint has SyntaxError.'), async () => {
    await expect(bp.loadBlueprints('path/', ['path/to/broken.blueprint'], {}, data))
      .rejects.toThrow('Parse error');
  });

  it(tn('throws Error', 'if blueprint is not located under the template path.'), async () => {
    await expect(bp.loadBlueprints('path/', ['another/path/to/.blueprint'], {}, {}))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it.each([1,2,3])(
    tn('throws SyntaxError', 'if render helper wrongly used(%i).'), 
    async (i) => {
      await expect(bp.loadBlueprints('path/', [`path/to/broken-render${i}.blueprint`], {}, {}))
        .rejects.toHaveProperty('name', 'SyntaxError');
    }
  );

  it.each([1,2,3])(
    tn('throws SyntaxError', 'if preload helper wrongly used(%i).'), 
    async (i) => {
      await expect(bp.loadBlueprints('path/', [`path/to/broken-preload${i}.blueprint`], {}, {}))
        .rejects.toHaveProperty('name', 'SyntaxError');
    }
  );

  it(tn('returns empty Data', 'if blueprint is empty.'), async () => {
    const result = await bp.loadBlueprints('path/', ['path/to/empty.blueprint'], {}, {});
    expect(result.sources).toEqual({});
    expect(result.preloads).toEqual({});
  });

  it(tn('returns empty Data', 'if blueprint doesn\'t contain render/preload helper.'), async () => {
    const result = await bp.loadBlueprints('path/', ['path/to/null.blueprint'], {}, {});
    expect(result.sources).toEqual({});
    expect(result.preloads).toEqual({});
  });

  it.each([1,2])(
    tn('returns a Source Data', 'if blueprint contains a render helper(%i).'), 
    async (i) => {
      const result = await bp.loadBlueprints('path/', [`path/to/single-render${i}.blueprint`], {}, data);
      expect(result.sources).toEqual({
        'to/test.txt': { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } }
      });
      expect(result.preloads).toEqual({});  
    }
  );

  it.each([1,2])(
    tn('returns a preload Data', 'if blueprint contains a preload helper(%i).'), 
    async (i) => {
      const result = await bp.loadBlueprints('path/', [`path/to/single-preload${i}.blueprint`], {}, data);
      expect(result.sources).toEqual({});
      expect(result.preloads).toEqual({
        'path/to/test.txt': '// preloaded.'
      });
    }
  );

  it(tn('returns a Data with multiple keys', 'if blueprint file contains multiple render helpers.'), async () => {
    const result = await bp.loadBlueprints('path/', ['path/to/multiple-render.blueprint', 'path/to/multiple-preload.blueprint'], {}, data);
    expect(result.sources).toEqual({
      'to/1.txt'    : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/2.txt'    : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/3.txt'    : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/true.txt' : { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } },
      'to/false.txt': { template: 'path/to/tmpl/test.hbs', extraData: { data: data.b } }
    });
    expect(result.preloads).toEqual({
      'path/to/1.txt'     : '// 1.',
      'path/to/2.txt'     : '// 2.',
      'path/to/3.txt'     : '// 3.',
      'path/to/true.txt'  : '// true.',
      'path/to/false.txt' : '// false.'  
    });
  });

});
