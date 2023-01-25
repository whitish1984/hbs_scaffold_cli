import { expect, it } from '@jest/globals';

import { tn } from '#/testUtil'; 

// test & mock targets
import * as util from '@/lib/util';

describe('exception', () => {
  it(tn('returns Error object', 'if argument set well.'), () => {
    const result = util.exception('name test', 'message test');
    expect(result).toHaveProperty('name', 'name test');
    expect(result).toHaveProperty('message', 'message test');
  });
});
