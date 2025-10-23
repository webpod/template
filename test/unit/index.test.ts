import {it, describe, expect} from 'vitest'

import {foo} from '../../src/index.ts'

describe('index', () => {
  it('foo matches bar', () => {
    expect(foo).equal('bar')
  })
})
