import { expect, jest, it } from '@jest/globals';
import type { Args } from '@/lib/main';

import Handlebars from 'handlebars';
import p from 'path';

import { tn, mapperFactory, requireFromString } from '#/testUtil'; 

// test targets
import { run } from '@/lib/main';
// mock targets.
import fs from 'fs/promises';

describe('run', () => {

  // TEST DATA
  const minimum: Args = {
    templateDir: 'path/',
    outputDir: './out'
  };
  const full: Args = {
    templateDir: 'path/',
    outputDir: './out',
    templates: ['path/to/tmpl.hbs.txt'],
    blueprints: ['path/to/.blueprint'],
    inputs: ['path/to/data.yaml'],
    customHelpers: ['path/to/helper.js'],
    preloads: ['path/to/preload.hbs.txt']
  };
  const STORE: Record<string, string> = {};

  beforeEach(() => {
    jest.mock(
      p.resolve('path/to/helper.js'), 
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
      () => requireFromString('module.exports.first = function(arr) { return arr[0]; };'), 
      {virtual: true}
    );
    (jest.spyOn(fs, 'readFile') as jest.Mock<(path:string)=>Promise<string>>)
      .mockImplementation(mapperFactory<string>({
        'path/to/.blueprint': '{{preload \'bp-preload.hbs.txt\'}}{{render \'bp-tmpl.txt\' \'bp-tmpl.hbs.txt\'}}',
        'path/to/data.yaml': 'hello: world\narr:\n  - 1\n  - 2\n  - 3\n',
        'path/to/tmpl.hbs.txt': '{{hello}}',
        'path/to/bp-tmpl.hbs.txt': '{{hello}}',
        'path/to/preload.hbs.txt': '{{first arr}}',
        'path/to/bp-preload.hbs.txt': '{{#each arr as |el|}}{{el}}{{/each}}'
      }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jest.spyOn(fs, 'stat') as jest.Mock<(path: string) => Promise<any>>)
      .mockImplementation(mapperFactory({
        'path/to/tmpl.hbs.txt': { isFile: () => true }
      }));
    (jest.spyOn(fs, 'writeFile') as jest.Mock<(path: string, out: string) => Promise<void>>)
      .mockImplementation((path, out) => { STORE[path] = out; return Promise.resolve(); });
    (jest.spyOn(fs, 'mkdir') as jest.Mock<(path: string, out: string) => Promise<void>>);
  });

  it(tn('runs well', 'if minimum properties are set for Args.'), async () => {
    const result = await run(minimum);
    expect(result.consolidatedData)
      .toEqual({_env: expect.any(Object)});

    expect(result.registerdHelpers).toEqual([]);

    expect(result.generatedFiles).toEqual([]);
    expect(STORE).toEqual({});
  });

  it(tn('runs well', 'if full properties are set for Args.'), async () => {
    const result = await run(full);
    expect(result.consolidatedData)
      .toEqual({_env: expect.any(Object), hello: 'world', arr: [1,2,3]});

    expect(result.registerdHelpers).toEqual(['first']);
    expect(Handlebars.helpers).toMatchObject({ first: expect.any(Function) });

    expect(result.generatedFiles).toEqual(['out/to/tmpl.txt', 'out/to/bp-tmpl.txt' ]);
    expect(STORE).toEqual({'out/to/tmpl.txt': '1123world', 'out/to/bp-tmpl.txt': '1123world'});
  });

});
