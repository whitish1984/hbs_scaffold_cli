import { expect, jest, it } from '@jest/globals';
import type { Data } from '@/lib/util';

import p from 'path';

import { tn, mapperFactory, requireFromString } from '#/testUtil'; 

// test targets
import * as df from '@/lib/dataFetcher';
// mock targets.
import * as bp from '@/lib/blueprint';
import fs from 'fs/promises';

describe('collectData', () => {

  // TEST DATA
  const testDataFetcher = mapperFactory<Data>({
    'path/to/1': { a: 1, b: 2 },
    'path/to/2': { b: 3, c: 4 },
    'path/to/3': {}
  });

  beforeEach(() => {
    df.initInputPaths();
  });

  it(tn('throws Error', 'if dataFetcher throws Error.'), async () => {
    const paths = [ 'path/to/1', 'path/to/not-found' /*not exist*/ ];
    await expect(df.collectData(paths, testDataFetcher))
      .rejects.toThrow();
    expect(df.getInputPaths()).toEqual([]);
  });

  it(tn('returns empty Data','if paths is empty.'), async () => {
    const result = await df.collectData([], testDataFetcher);
    expect(result).toEqual({});
    expect(df.getInputPaths()).toEqual([]);
  });

  it(tn('returns empty Data', 'if dataFetcher returns empty.'), async () => {
    const result = await df.collectData([ 'path/to/3' ], testDataFetcher);
    expect(result).toEqual({});
    expect(df.getInputPaths()).toEqual(['path/to/3']);
  });

  it(tn('returns Data', 'if dataFetcher returns Data with a path.'), async () => {
    const result = await df.collectData([ 'path/to/1' ], testDataFetcher);
    expect(result).toEqual({ a: 1, b: 2 });
    expect(df.getInputPaths()).toEqual(['path/to/1']);
  });

  it(tn('returns merged Data', 'if dataFetcher returns multiple Data with paths.'), async () => {
    const result = await df.collectData([ 'path/to/1', 'path/to/2', 'path/to/3' ], testDataFetcher);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
    expect(df.getInputPaths()).toEqual(['path/to/1','path/to/2','path/to/3']);
  });

  it(tn('stores unique executed paths', 'if it is executed multiple times.'), async () => {
    await df.collectData([ 'path/to/3', 'path/to/1' ], testDataFetcher);
    await df.collectData([ 'path/to/1', 'path/to/2' ], testDataFetcher);
    expect(df.getInputPaths()).toEqual(['path/to/1','path/to/2','path/to/3']);
  });

});

describe('helpersDataFetcher', () => {

  // TEST DATA
  /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
  const brokenModule = () => requireFromString('var test = "'); // missing double quote
  const emptyModule  = () => requireFromString(''); // empty file
  const validModule  = () => requireFromString(`
    module.exports.first = function(arr) { return arr[0]; };
    function last(arr) { return arr[arr.length - 1]; }
    module.exports.last = last;
  `);
  /* eslint-enable */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const expected = { first: expect.any(Function), last: expect.any(Function) };

  it(tn('throws Error', 'if input file is not found.'), async () => {
    await expect(df.helpersDataFetcher('path/to/not-found.txt' /* file not exist */))
      .rejects.toThrow('Cannot find module');
  });

  it(tn('throws Error', 'if input js is invalid.'), async () => {
    jest.mock(p.resolve('path/to/broken.js'), brokenModule, {virtual: true});
    await expect(df.helpersDataFetcher('path/to/broken.js'))
      .rejects.toThrow();
  });

  it(tn('returns empty data', 'if input js is empty.'), async () => {
    jest.mock(p.resolve('path/to/empty.js'), emptyModule, {virtual: true});
    const result = await df.helpersDataFetcher('path/to/empty.js');
    expect(result).toEqual({});
  });

  it(tn('returns Data', 'if input js is valid.'), async () => {
    jest.mock(p.resolve('path/to/valid.js'), validModule, {virtual: true});
    const result = await df.helpersDataFetcher('path/to/valid.js');
    expect(result).toEqual(expected);
    expect((result.first as (str: string[]) => string)(['one','two','three'])).toBe('one');
    expect((result.last as (str: string[]) => string)(['one','two','three'])).toBe('three');
  });

});

describe('inputsDataFetcher', () => {

  // TEST DATA
  let mockReadFile: jest.Mock<(path:string) => Promise<string>>;
  const MAP = {
    'path/to/empty.txt'   : '',
    'path/to/broken.yaml' : '0: test\n1 true', // missing semi-colon
    'path/to/broken.json' : '{"0": "test" "1": true}', // missing comma
    'path/to/valid.yaml'  : 'bool: true\nstring: \'path/to/target.txt\'\narray:\n  - a\n  - b\nchild:\n  array: [ 456, false, z ]\n  number: 123\n',
    'path/to/valid.json'  : '{"bool":true,"string":"path\\/to\\/target.txt","array":["a","b"],"child":{"array":[456,false,"z"],"number":123}}'
  };
  const expected = { bool: true, string: 'path/to/target.txt', array: [ 'a', 'b' ], child: { array: [ 456, false, 'z' ], number: 123}};

  beforeEach(() => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<(path: string) => Promise<string>>;
    mockReadFile.mockImplementation((path: string) => mapperFactory<string>(MAP)(path));
  });

  it(tn('throws Error', 'if input file is not found.'), async () => {
    mockReadFile.mockRestore();
    await expect(df.inputsDataFetcher('path/to/not-found.txt' /* file not exist */))
      .rejects.toThrow('ENOENT');
  });

  it(tn('throws SyntaxError', 'if input yaml is invalid.'), async () => {
    await expect(df.inputsDataFetcher('path/to/broken.yaml'))
      .rejects.toHaveProperty('name', 'SyntaxError');
  });

  it(tn('throws SyntaxError', 'if input json is invalid.'), async () => {
    await expect(df.inputsDataFetcher('path/to/broken.json'))
      .rejects.toHaveProperty('name', 'SyntaxError');
  });

  it(tn('returns empty Data', 'if input file is empty.'), async () => {
    const result = df.inputsDataFetcher('path/to/empty.txt');
    await expect(result).resolves.toEqual({});
  });

  it(tn('returns Data', 'if input yaml is valid.'), async () => {
    const result = df.inputsDataFetcher('path/to/valid.yaml');
    await expect(result).resolves.toEqual(expected);
  });

  it(tn('returns Data', 'if input json is valid.'), async () => {
    const result = df.inputsDataFetcher('path/to/valid.json');
    await expect(result).resolves.toEqual(expected);
  });

});

describe('generateDataFetcher', () => {

  // TEST DATA
  let mockStat: jest.Mock<typeof fs.stat>;
  let mockLoadBlueprint: jest.Mock<typeof bp.loadBlueprint>;
  const MAP = {
    'path/to/file.txt'                : {isFile: ()=>true,  isDirectory: ()=>false },
    'path/to/file.hbs.txt'            : {isFile: ()=>true,  isDirectory: ()=>false },
    'path/to/file.HANDLEBARS.txt'     : {isFile: ()=>true,  isDirectory: ()=>false },
    'path/to/file.handlebars.hbs.txt' : {isFile: ()=>true,  isDirectory: ()=>false },
    'path/to/file.HBS.handlebars.txt' : {isFile: ()=>true,  isDirectory: ()=>false },
    'path/to/.blueprint'              : {isFile: ()=>true,  isDirectory: ()=>false },
    'another/to/file.txt'             : {isFile: ()=>true,  isDirectory: ()=>false },
    'path/to/.handlebars'             : {isFile: ()=>true,  isDirectory: ()=>false },
    'path/to/dir'                     : {isFile: ()=>false, isDirectory: ()=>true  },
    'path/to/broken.txt'              : {isFile: ()=>false, isDirectory: ()=>false }
  };
  const generateDataFetcher = df.generateDataFetcherFactory('path/to/', {});

  beforeEach(() => {
    mockStat = jest.spyOn(fs, 'stat') as jest.Mock<typeof fs.stat>;
    mockStat.mockImplementation(path => mapperFactory(MAP)(path as string));
  });

  it(tn('throws Error', 'if no file is found at a template path.'), async () => {
    mockStat.mockRestore();
    await expect(generateDataFetcher('path/to/not-found.txt' /* file not exist */))
      .rejects.toThrow('ENOENT');
  });

  it(tn('throws RuntimeError', 'if template path points to a directory.'), async () => {
    await expect(generateDataFetcher('path/to/dir'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it(tn('throws RuntimeError', 'if template file is broken.'), async () => {
    await expect(generateDataFetcher('path/to/broken.txt'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it(tn('throws RuntimeError', 'if template file is not located inside the template directory.'), async () => {
    await expect(generateDataFetcher('another/to/file.txt'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it(tn('throws RuntimeError', 'if template file name is invalid.'), async () => {
    await expect(generateDataFetcher('path/to/.handlebars'))
      .rejects.toHaveProperty('name', 'RuntimeError');
  });

  it.each([
    'path/to/file.txt',
    'path/to/file.hbs.txt',
    'path/to/file.HANDLEBARS.txt',
  ])(tn('returns Data', 'if template path is: %s.'), async (path: string) => {
    const result = await generateDataFetcher(path);
    expect(result).toEqual({ 'file.txt': { template: path, extraData: {} } });
  });

  it(tn('returns Data', 'if template path is: path/to/file.handlebars.hbs.txt.'), async () => {
    const result = await generateDataFetcher('path/to/file.handlebars.hbs.txt');
    expect(result).toEqual({ 'file.hbs.txt': { template: 'path/to/file.handlebars.hbs.txt', extraData: {} } });
  });

  it(tn('returns Data', 'if template path is: path/to/file.HBS.handlebars.txt.'), async () => {
    const result = await generateDataFetcher('path/to/file.HBS.handlebars.txt');
    expect(result).toEqual({ 'file.handlebars.txt': { template: 'path/to/file.HBS.handlebars.txt', extraData: {} } });
  });

  it(tn('returns Data', 'if template path is pointed at .blueprint file.'), async () => {
    mockLoadBlueprint = jest.spyOn(bp, 'loadBlueprint') as jest.Mock<typeof bp.loadBlueprint>;
    mockLoadBlueprint.mockResolvedValue({
      'a.txt': { template: 'path/to/file.handlebars.txt', extraData: { param: 'a' } },
      'b.txt': { template: 'path/to/file.handlebars.txt', extraData: { param: 'b' } }
    });
    const result = await generateDataFetcher('path/to/.blueprint');
    expect(result).toEqual({
      'a.txt': { template: 'path/to/file.handlebars.txt', extraData: { param: 'a' } },
      'b.txt': { template: 'path/to/file.handlebars.txt', extraData: { param: 'b' } }
    });
  });

});
