import { describe, expect, it } from 'vite-plus/test'
import mockServer, { Server } from '../../server/src/main'
import { createClient } from './client'

describe('createClient', () => {
  it('Should create a client', async () => {
    const client = await createClient({
      qrURLSource: 'http://example.com/saizeriya3/qr',
      fetchSource: mockServer.fetch,
      peopleCount: 4,
    })
    expect(client.getState().peopleCount).toBe(4)
    expect(client.getState().pageKind).toBe('menu')
    await expect(client.call()).resolves.toEqual({ result: 'OK' })
  })

  it('starts at the entry page until a people count is registered', async () => {
    const client = await createClient({
      qrURLSource: 'http://example.com/saizeriya3/qr',
      fetchSource: mockServer.fetch,
    })
    expect(client.getState().peopleCount).toBe(0)
    expect(client.getState().pageKind).toBe('entry')

    await client.setPeopleCount(2)
    expect(client.getState().peopleCount).toBe(2)
    expect(client.getState().pageKind).toBe('menu')
  })

  it('shares entry completion across devices using the same QR', async () => {
    const server = new Server()
    const table = server.createNewTable(525, 51)
    const qrURLSource = table.createQRCodeURL('http://example.com', '/saizeriya3')

    const firstDevice = await createClient({
      qrURLSource,
      fetchSource: server.app.fetch,
    })
    expect(firstDevice.getState().pageKind).toBe('entry')

    const secondDeviceBeforeRegistration = await createClient({
      qrURLSource,
      fetchSource: server.app.fetch,
    })
    expect(secondDeviceBeforeRegistration.getState().pageKind).toBe('entry')

    await firstDevice.setPeopleCount(5)

    const secondDeviceAfterRegistration = await createClient({
      qrURLSource,
      fetchSource: server.app.fetch,
    })
    expect(secondDeviceAfterRegistration.getState().pageKind).toBe('top')
    expect(secondDeviceAfterRegistration.getState().peopleCount).toBe(5)
  })

  it('looks up and adds items sequentially', async () => {
    const client = await createClient({
      qrURLSource: 'http://example.com/saizeriya3/qr',
      fetchSource: mockServer.fetch,
      peopleCount: 3,
    })

    await Promise.all([client.addItem('1202', { count: 2 }), client.addItem('3201')])

    expect(client.getState().cart).toMatchObject([
      { id: '1202', count: 2, name: '小ｴﾋﾞのｻﾗﾀﾞ' },
      { id: '3201', count: 1, name: 'ﾃｨﾗﾐｽｸﾗｼｺ' },
    ])

    await client.removeCartItem(0)
    expect(client.getState().cart).toMatchObject([{ id: '3201', count: 1, name: 'ﾃｨﾗﾐｽｸﾗｼｺ' }])
    expect(client.getState().pageKind).toBe('main')

    await expect(client.lookupItem('3215')).resolves.toMatchObject({
      result: 'OK',
      item_data: { id: '3215', name: 'ｺｰﾋｰｾﾞﾘｰ&ﾐﾙｸｼﾞｪﾗｰﾄ' },
    })
  })

  it('parses submitted order totals from the official account page', async () => {
    const client = await createClient({
      qrURLSource: 'http://example.com/saizeriya3/qr',
      fetchSource: mockServer.fetch,
      peopleCount: 2,
    })

    await client.addItem('1202', { count: 2 })
    await client.addItem('3201')
    await client.submitOrder()

    const result = await client.getAccount()
    expect(result.state.pageKind).toBe('account')
    expect(result.account.count).toBe(3)
    expect(result.account.total).toBe(1000)
    expect(result.account.lines[0]).toMatchObject({
      name: '小ｴﾋﾞのｻﾗﾀﾞ',
      count: 2,
      price: 700,
    })
  })

  it('can confirm checkout and move to the official receipt page', async () => {
    const client = await createClient({
      qrURLSource: 'http://example.com/saizeriya3/qr',
      fetchSource: mockServer.fetch,
      peopleCount: 2,
    })

    await client.addItem('1202')
    await client.submitOrder()

    const result = await client.getReceipt()
    expect(result.state.pageKind).toBe('receipt')
    expect(result.receipt.barcodeValue).toMatch(/^\d+$/)
    expect(result.receipt.barcodeImageSrc).toMatch(/^data:image\/png;base64,/)
  })
})
