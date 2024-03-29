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

describe('fairdrive connector module', () => {
  let module: FdpConnectModule
  const username = process.env.USERNAME || ''
  const password = process.env.PASSWORD || ''

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
      },
    })
  })
  it('should instantiate module with one provider', async () => {
    const fairosConnector = await module.connect('fairos')

    expect(fairosConnector).toBeDefined()
  })

  it('should list mounts', async () => {
    const fairosConnector = await module.connect('fairos')

    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()

    expect(mounts.length).toBe(3)
  })

  xit('should list directories', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)
    const fs = await fairosConnector.getFSHandler(mounts[0])
    const entries = await fs.entries()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        dirs: [
          {
            accessTime: faker.datatype.datetime().getTime(),
            blockSize: '1024',
            contentType: faker.system.mimeType(),
            creationTime: faker.datatype.datetime().getTime(),
            mode: 0,
            modificationTime: faker.datatype.datetime().getTime(),
            name: faker.system.fileName(),
            size: faker.datatype.number(),
          },
        ],
      }),
    )

    const entry = await entries.next()
    expect(entry.value[0]).toBe('panama')
    const end = await entries.next()
    expect(end.done).toBe(true)
  })

  xit('should list files', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)

    fetchMock.mockResponseOnce(
      JSON.stringify({
        files: [
          {
            accessTime: faker.datatype.datetime().getTime(),
            blockSize: '1024',
            contentType: faker.system.mimeType(),
            creationTime: faker.datatype.datetime().getTime(),
            mode: 0,
            modificationTime: faker.datatype.datetime().getTime(),
            name: faker.system.fileName(),
            size: faker.datatype.number(),
            tag: 0,
          },
        ],
      }),
    )

    const fs = await fairosConnector.getFSHandler(mounts[0])
    const entries = await fs.entries()
    const entry = await entries.next()
    expect(entry.value[0].tag).toBe(undefined)
    const end = await entries.next()
    expect(end.done).toBe(true)
  })
  it('should upload file', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)

    fetchMock.mockResponseOnce(
      JSON.stringify({
        dirs: [
          {
            accessTime: faker.datatype.datetime().getTime(),
            blockSize: '1024',
            contentType: faker.system.mimeType(),
            creationTime: faker.datatype.datetime().getTime(),
            mode: 0,
            modificationTime: faker.datatype.datetime().getTime(),
            name: faker.system.fileName(),
            size: faker.datatype.number(),
          },
        ],
      }),
    )

    const driver = module.getConnectedProviders('fairos')
    await driver.filesystemDriver.upload(new File([], faker.system.fileName()), mounts[0], {})
    expect(fetchMock).toHaveBeenCalled()
  })
  it('should transfer file', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)

    fetchMock.mockResponseOnce(
      JSON.stringify({
        dirs: [
          {
            accessTime: faker.datatype.datetime().getTime(),
            blockSize: '1024',
            contentType: faker.system.mimeType(),
            creationTime: faker.datatype.datetime().getTime(),
            mode: 0,
            modificationTime: faker.datatype.datetime().getTime(),
            name: faker.system.fileName(),
            size: faker.datatype.number(),
          },
        ],
      }),
    )

    const receiver = module.getConnectedProviders('fairos').getTransferHandler()
    await receiver.transfer(new File([], faker.system.fileName()), mounts[0])
    expect(fetchMock).toHaveBeenCalled()
  })
  it('should download file', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)

    fetchMock.mockResponseOnce(JSON.stringify([200, 100, 222, 234, 256, 89]))

    const driver = module.getConnectedProviders('fairos')
    await driver.filesystemDriver.download('file', mounts[0], {})
  })
  it('should delete file', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)
    const file = faker.system.filePath()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        filePath: file,
        podName: 'panama',
      }),
    )

    const driver = module.getConnectedProviders('fairos')
    const resp = await driver.filesystemDriver.delete(file, mounts[0])
    expect(resp).toBe(true)
  })
  it('should create dir', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)

    fetchMock.mockResponseOnce(
      JSON.stringify({
        dirPath: '/dir',
        podName: 'panama',
      }),
    )

    const driver = module.getConnectedProviders('fairos')
    const resp = await driver.filesystemDriver.createDir('/dir', mounts[0])
    expect(resp).toBe(true)
  })
  it('should validate if file exists', async () => {
    const fairosConnector = await module.connect('fairos')
    expect(fairosConnector).toBeDefined()
    fetchMock.mockResponseOnce(
      JSON.stringify({
        address: faker.finance.ethereumAddress(),
        message: 'mock response ',
        nameHash: faker.datatype.hexadecimal({ length: 32, prefix: '', case: 'lower' }),
        publicKey: faker.datatype.hexadecimal({ length: 64, prefix: '', case: 'lower' }),
      }),
    )

    await fairosConnector.userLogin(username, password)

    expect(fetchMock).toHaveBeenCalled()

    fetchMock.mockResponseOnce(
      JSON.stringify({
        pods: ['panama', 'colombia', 'costa_rica'],
        sharedPods: ['nicaragua'],
      }),
    )

    const mounts = await fairosConnector.listMounts()
    expect(fetchMock).toHaveBeenCalled()
    expect(mounts.length).toBe(3)

    fetchMock.mockResponseOnce(
      JSON.stringify({
        accessTime: faker.date.past(),
        blockSize: '1024',
        blocks: [
          {
            compressedSize: 'string',
            reference: 'string',
            size: 'string',
          },
        ],
        compression: 'gzip',
        contentType: faker.system.mimeType(),
        creationTime: faker.date.past(),
        fileName: faker.system.fileName(),
        filePath: faker.system.filePath(),
        fileSize: '1024',
        mode: 0,
        modificationTime: faker.date.past(),
        podName: 'panama',
        tag: 0,
      }),
    )

    const driver = module.getConnectedProviders('fairos')
    const resp = await driver.filesystemDriver.exists('/file', mounts[0])
    expect(resp).toBe(false)
  })
})
