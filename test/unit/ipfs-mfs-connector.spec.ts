import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import { faker } from '@faker-js/faker'
import { FdpConnectModule } from '../../src/core/module'
import fetchMock from 'jest-fetch-mock'
import { FormData } from 'formdata-polyfill/esm.min.js'
import { Blob } from 'fetch-blob'
import { File } from 'fetch-blob/file.js'

global.FormData = FormData
global.Blob = Blob
global.File = File

describe('ipfs mfs driver', () => {
  let module: FdpConnectModule
  const DefaultMount = { name: 'default', path: '/' }

  afterEach(() => {
    fetchMock.resetMocks()
  })
  beforeEach(async () => {
    fetchMock.doMock()

    // Create a FairdriveConnectorModule
    module = new FdpConnectModule({
      providers: {
        fairos: {
          options: {
            host: 'https://fairos.staging.fairdatasociety.org/',
          },
          driver: import('../../src'),
          type: 'FairosProvider',
        },
        ipfsmfs: {
          options: {
            host: 'http://localhost:5001',
          },
          driver: import('../../src'),
          type: 'IPFSMfsProvider',
        },
      },
    })
  })
  it('should instantiate module with one provider', async () => {
    const ipfs = await module.connect('ipfsmfs')

    expect(ipfs).toBeDefined()
  })

  xit('should list directories', async () => {
    const ipfs = await module.connect('ipfsmfs')

    expect(ipfs).toBeDefined()

    fetchMock.mockOnce(async req => {
      req.headers.set('Content-Type', 'application/json')

      return Promise.resolve({
        body: JSON.stringify({
          Entries: [
            {
              Hash: faker.datatype.hexadecimal({ prefix: '' }),
              Name: faker.system.fileName(),
              Size: '1024',
              Type: '1',
            },
            {
              Hash: faker.datatype.hexadecimal({ prefix: '' }),
              Name: faker.system.fileName(),
              Size: '1024',
              Type: '1',
            },
          ],
        }),
      })
    })

    const DefaultMount = { name: 'default', path: '/' }
    const fs = await ipfs.getFSHandler(DefaultMount)
    const entries = await fs.entries()
    const entry = await entries.next()
    expect(entry.value[0]).toBe('panama')
    const end = await entries.next()
    expect(end.done).toBe(true)
  })

  xit('should list files', async () => {
    const ipfs = await module.connect('ipfsmfs')

    expect(ipfs).toBeDefined()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        Entries: [
          {
            Hash: `QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5n`,
            Name: faker.system.fileName(),
            Size: '1024',
            Type: '1',
          },
        ],
      }),
    )

    const fs = await ipfs.getFSHandler(DefaultMount)
    const entries = await fs.entries()
    const entry = await entries.next()
    expect(entry.value[0]).toBe('panama')
    const end = await entries.next()
    expect(end.done).toBe(true)
  })
  it('should upload file', async () => {
    const ipfs = await module.connect('ipfsmfs')

    expect(ipfs).toBeDefined()

    fetchMock.mockOnce(async () =>
      Promise.resolve({
        status: 200,
        body: JSON.stringify({ Hash: 'QmYyQSo1c1Ym7orWxLYvCrM2EmxFTANf8wXmmE7DWjhx5n' }),
      }),
    )
    const driver = module.getConnectedProviders('ipfsmfs')
    await driver.filesystemDriver.upload(new File([], faker.system.fileName()), DefaultMount, {})
  })
  xit('should download file', async () => {
    const ipfs = await module.connect('ipfsmfs')

    expect(ipfs).toBeDefined()

    fetchMock.mockOnce(async () =>
      Promise.resolve({
        status: 200,
        body: '',
      }),
    )
    const driver = module.getConnectedProviders('ipfsmfs')
    const resp = await driver.filesystemDriver.download('/file', DefaultMount, {})
    expect(resp).toBe(true)
  })
  it('should create dir', async () => {
    const ipfs = await module.connect('ipfsmfs')

    expect(ipfs).toBeDefined()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        Entries: [
          {
            Hash: '<string>',
            Name: '<string>',
            Size: '<int64>',
            Type: '<int>',
          },
        ],
      }),
    )

    const driver = module.getConnectedProviders('ipfsmfs')
    const resp = await driver.filesystemDriver.createDir('/dir', DefaultMount)
    expect(resp).toBe(true)
  })
  xit('should validate if file exists', async () => {
    const ipfs = await module.connect('ipfsmfs')

    expect(ipfs).toBeDefined()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        Blocks: '<int>',
        CumulativeSize: '<uint64>',
        Hash: '<string>',
        Local: '<bool>',
        Size: '<uint64>',
        SizeLocal: '<uint64>',
        Type: '<string>',
        WithLocality: '<bool>',
      }),
    )

    const driver = module.getConnectedProviders('ipfsmfs')
    const resp = await driver.filesystemDriver.exists('/file', DefaultMount)
    expect(resp).toBe(false)
  })
})
