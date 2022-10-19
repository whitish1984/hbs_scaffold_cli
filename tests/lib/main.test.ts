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
  const valid: Args = {
    templates: ['path/to/tmpl.hbs.txt'],
    outputDir: './out',
    templateDir: 'path/',
    inputs: ['path/to/data.yaml'],
    customHelpers: ['path/to/helper.js']
  };
  const STORE = { writeFile: '', mkDir: '' };

  it(tn('returns result Data', 'if paths is empty.'), async () => {
    jest.mock(
      p.resolve('path/to/helper.js'), 
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
      () => requireFromString('module.exports.first = function(arr) { return arr[0]; };'), 
      {virtual: true}
    );
    (jest.spyOn(fs, 'readFile') as jest.Mock<(path:string)=>Promise<string>>)
      .mockImplementation(mapperFactory<string>({
        'path/to/data.yaml': 'hello: world\narr:\n  - 1\n  - 2\n  - 3\n',
        'path/to/tmpl.hbs.txt': '{{hello}}{{first arr}}'
      }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jest.spyOn(fs, 'stat') as jest.Mock<(path: string) => Promise<any>>)
      .mockImplementation(mapperFactory({
        'path/to/tmpl.hbs.txt': { isFile: () => true }
      }));
    (jest.spyOn(fs, 'writeFile') as jest.Mock<(path: string, out: string) => Promise<void>>)
      .mockImplementation((_path, out) => { STORE.writeFile = out; return Promise.resolve(); });
    (jest.spyOn(fs, 'mkdir') as jest.Mock<(path: string) => Promise<string>>)
      .mockImplementation((path) => Promise.resolve(STORE.mkDir = path));
  
    const result = await run(valid);
    expect(result.consolidatedData)
      .toEqual({_env: expect.any(Object), hello: 'world', arr: [1,2,3]});

    expect(result.registerdHelpers).toEqual(['first']);
    expect(Handlebars.helpers).toMatchObject({ first: expect.any(Function) });

    expect(result.generatedFiles).toEqual(['out/to/tmpl.txt']);
    expect(STORE).toEqual({writeFile: 'world1', mkDir: 'out/to'});
  });

});
