import { describe, it } from 'bun:test'
import mockServer from '@repo/saizeriya-server'
import { createClient } from './client'

describe('createClient', () => {
  it('Should create a client', async () => {
    const client = await createClient({
      qrURLSource: 'http://example.com/saizeriya3/qr',
      fetchSource: mockServer.fetch,
      peopleCount: 4,
    })
    client.call()
  })
})
