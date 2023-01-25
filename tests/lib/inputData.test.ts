import { expect, jest, it } from '@jest/globals';

import { tn, mapperFactory } from '#/testUtil'; 

// test targets
import * as id from '@/lib/inputData';

// mock targets.
import fs from 'fs/promises';

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

describe('inputsDataFetcher', () => {

  beforeEach(() => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<(path: string) => Promise<string>>;
    mockReadFile.mockImplementation((path: string) => mapperFactory<string>(MAP)(path));
  });

  it(tn('throws Error', 'if the input file is not found.'), async () => {
    mockReadFile.mockRestore();
    await expect(id.inputsDataFetcher('path/to/not-found.txt' /* file not exist */))
      .rejects.toThrow('ENOENT');
  });

  it(tn('throws SyntaxError', 'if the input yaml is invalid.'), async () => {
    await expect(id.inputsDataFetcher('path/to/broken.yaml'))
      .rejects.toHaveProperty('name', 'SyntaxError');
  });

  it(tn('throws SyntaxError', 'if the input json is invalid.'), async () => {
    await expect(id.inputsDataFetcher('path/to/broken.json'))
      .rejects.toHaveProperty('name', 'SyntaxError');
  });

  it(tn('returns empty Data', 'if the input file is empty.'), async () => {
    const result = id.inputsDataFetcher('path/to/empty.txt');
    await expect(result).resolves.toEqual({});
  });

  it(tn('returns Data', 'if the input yaml is valid.'), async () => {
    const result = id.inputsDataFetcher('path/to/valid.yaml');
    await expect(result).resolves.toEqual(expected);
  });

  it(tn('returns Data', 'if the input json is valid.'), async () => {
    const result = id.inputsDataFetcher('path/to/valid.json');
    await expect(result).resolves.toEqual(expected);
  });

});

describe('collectInputData', () => {

  it(tn('returns Data', 'the input file is valid.'), async () => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<(path: string) => Promise<string>>;
    mockReadFile.mockImplementation((path: string) => mapperFactory<string>(MAP)(path));
    const result = id.collectInputData(['path/to/valid.json', 'path/to/valid.yaml']);
    await expect(result).resolves.toEqual(expected);
  });

});

describe('naturalCast', () => {

  // TEST DATA
  const fn = () => true;
  const condition = {
    null: null, nullStr: 'null',
    bool: true, boolStr: 'true',
    number: 123, numberStr: '123',
    array: ['test', true, 456], arrayStr: '["test", true, 456]', 
    child: { bool: false, boolStr: 'false', fn: fn },
    objectStr: '{ "one": true, "two": 456, "three": "test" }',
    invalid: '{ "one": true "two": 456, "three": "test" }' // comma missing.
  };
  const expected = {
    null: null, nullStr: null,
    bool: true, boolStr: true,
    number: 123, numberStr: 123,
    objectStr: { one: true, two: 456, three: 'test' },
    array: ['test', true, 456], arrayStr: ['test', true, 456], 
    child: { bool: false, boolStr: false, fn: fn },
    invalid: '{ "one": true "two": 456, "three": "test" }' // keep as it is.
  };

  it(tn('returns naturally casted Data', 'if a Data is processed.'), () => {
    const result = id.naturalCast(condition);
    expect(result).toEqual(expected);
  });

});
