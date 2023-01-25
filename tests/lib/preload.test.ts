import { expect, jest, it } from '@jest/globals';

import { tn, mapperFactory } from '#/testUtil'; 

// test targets
import * as pl from '@/lib/preload';

// mock targets.
import fs from 'fs/promises';

// TEST DATA
let mockReadFile: jest.Mock<(path:string) => Promise<string>>;
const expected1 = '//preload1\n';
const expected2 = '//preload2\n';
const MAP = {
  'path/to/empty.txt' : '',
  'path/to/valid1.txt' : expected1,
  'path/to/valid2.txt' : expected2
};

describe('preloadDataFetcher', () => {

  beforeEach(() => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<(path: string) => Promise<string>>;
    mockReadFile.mockImplementation((path: string) => mapperFactory<string>(MAP)(path));
  });

  it(tn('throws Error', 'if the input file is not found.'), async () => {
    mockReadFile.mockRestore();
    await expect(pl.preloadDataFetcher('path/to/not-found.txt' /* file not exist */))
      .rejects.toThrow('ENOENT');
  });

  it(tn('returns Data', 'if the input file is empty.'), async () => {
    const result = pl.preloadDataFetcher('path/to/empty.txt');
    await expect(result).resolves.toEqual({'path/to/empty.txt': ''});
  });

  it(tn('returns Data', 'if the input file is valid.'), async () => {
    const result = pl.preloadDataFetcher('path/to/valid1.txt');
    await expect(result).resolves.toEqual({'path/to/valid1.txt': expected1});
  });

});

describe('collectPreloads', () => {

  it(tn('returns Data', 'the input file is valid.'), async () => {
    mockReadFile = jest.spyOn(fs, 'readFile') as jest.Mock<(path: string) => Promise<string>>;
    mockReadFile.mockImplementation((path: string) => mapperFactory<string>(MAP)(path));
    const result = pl.collectPreloads(['path/to/valid1.txt', 'path/to/valid2.txt']);
    await expect(result).resolves.toEqual({
      'path/to/valid1.txt': expected1,
      'path/to/valid2.txt': expected2
    });
  });

});

describe('joinPreloaded', () => {

  it(tn('returns naturally casted Data', 'if a Data is processed.'), () => {
    const result = pl.joinPreloaded(MAP);
    expect(result).toEqual(expected1+expected2);
  });

});
