# fairdrive-connector
Fairdrive Connector - integrate data sources from Web 2.0 or Web 3.0

**Warning: This project is in alpha state. There might (and most probably will) be changes in the future to its API and working. Also, no guarantees can be made about its stability, efficiency, and security at this stage.**

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Drivers](#drivers)
- [License](#license)

## Install

`npm install @fairdatasociety/fairdrive-connector`

## Usage
```typescript
import { FdpConnectModule, FairosProvider, IPFSMfsProvider } from '@fairdatasociety/fairdrive-connector'
import { fileSave } from 'browser-fs-access'

// Add providers
const module = new FdpConnectModule({
  providers: {
    fairos: {
      options: {
        host: 'https://fairos.staging.fairdatasociety.org/',
      },
      provider: '@fairdatasociety/fairdrive-connector/providers/fairos',
    },
    ipfs: {
      options: {
        host: 'http://localhost:5001/api/v0/',
      },
      provider: '@fairdatasociety/fairdrive-connector/providers/ipfs-mfs',
    },    
  },
})

// Connect to Fairos
const connector = await module.connect('fairos', FairosProvider)

// Provider calls that manage authentication, authz and mounts are at the top level
await connector.userLogin(process.env.REACT_APP_USERNAME, process.env.REACT_APP_PASSWORD)

// Fairdrive Connector pods are called Mounts
const podList = await connector.listMounts()

const selectedMount = {
  name: podList[0],
  path: '/'
}

await connector.podOpen(selectedMount)

// OPFS driver interface is available with getFSHandler
const currentFolderHandle = await connector.getFSHandler(selectedMount)
const files = []

// ===================================
// List of files and folders
// ===================================
for await (let [name, entry] of currentFolderHandle.entries()) {
  if (entry.kind === 'directory') {
    const item = { id: name, name: name, isDir: true, handle: entry }
    files.push(item)
  } else {
    const item = { id: name, name: name, isDir: false, handle: entry }
    files.push(item)
  }
}
// ===================================
// Uploading file
// ===================================
// Request user to select a file
const [picker] = await showOpenFilePicker({
  types: [], // default
  multiple: false, // default
  excludeAcceptAllOption: false, // default
  _preferPolyfill: false, // default
})

// returns a File Instance
const file = await picker.getFile()

const fileHandle = await currentFolderHandle.getFileHandle(file.name, { create: true })
const writable = await fileHandle.createWritable({ keepExistingData: false })
await writable.write(file)
await writable.close()

// ===================================
// Downloading file
// ===================================
const blob = fileHandle.getFile()
// Save a file.
fileSave(blob, {
  fileName: fileHandle.name,
})

// ===================================
// Upload file using IPFS driver directly
// ===================================
await module.connect('ipfs', IPFSMfsProvider)
const ipfsConnector = module.getConnectedProviders('ipfs')
const DefaultMount = {
  name: 'default',
  path: '/',
}
await ipfsConnector.filesystemDriver.upload(file, DefaultMount, {})

```

## Drivers

- Fairos: `@fairdatasociety/fairdrive-connector/providers/fairos`
- IPFS-Mfs: `@fairdatasociety/fairdrive-connector/providers/ipfs-mfs`

### Implementing a new Fairdrive Connector

Create a new `FdpConnectProvider` and `ProviderDriver` and implement interfaces. Provider contains implementation logic related to non file system concerns like identity, authentication and authorization.

```typescript
import { Mount, Entries, FdpConnectProvider } from '../core/provider'
import { ProviderDriver } from '../core/provider-driver'
import { create, IPFSHTTPClient } from 'ipfs-http-client'
/**
 * IpfsMfsProviderDriver is the driver for the IPFS MFS provider.
 */
export class IpfsMfsProviderDriver implements ProviderDriver {
  host: any
  client: IPFSHTTPClient
  constructor(options: { host: string }) {
    this.host = options.host
    this.client = create({ url: options.host })
  }
  /**
   * Verify if a file exists
   * @param path - path to the file
   * @param mount - mount to check
   * @returns Returns true if the file exists, else false
   */
  async exists(path: string, mount: Mount): Promise<boolean> {
    const stat = await this.client.files.stat(path)

    return stat.cid.byteLength > 0
  }

  /**
   * Creates a directory
   * @param name - directory name
   * @param mount - mount to check
   * @returns Returns true if the directory created, else false
   */
  async createDir(name: string, mount: Mount): Promise<boolean> {
    try {
      await this.client.files.mkdir(name)

      return true
    } catch (e) {
      return false
    }
  }

  async delete(filePath: string, mount: Mount): Promise<boolean> {
    try {
      await this.client.files.rm(filePath)

      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  async read(mount: Mount): Promise<Entries> {
    const entries = {
      dirs: [],
      files: [],
      mount,
    } as Entries

    for await (const i of this.client.files.ls(`${mount.path}`)) {
      if (i.type === 'directory') {
        entries.dirs.push(i.cid.toString())
      } else {
        entries.files.push(i.cid.toString())
      }
    }

    return entries
  }

  /**
   * Download a file
   * @param id - id of the file
   * @param mount - mount to download the file from
   * @param options - options
   * @returns
   */
  async download(id: string, mount: Mount, options = {}): Promise<any> {
    let bs
    for await (const res of this.client.files.read(`${mount.path}/${id}`, options)) {
      bs = res
    }

    return bs as Uint8Array
  }

  /**
   * Upload a file
   * @param file - file to upload
   * @param mount - mount to upload to
   * @param options - options
   */
  async upload(file: File, mount: Mount, options = {}): Promise<any> {
    const res = this.client.files.write(`${mount.path}/${file.name}`, file, options as any)

    return res
  }
}
/**
 * IPFSMfsProvider is the provider for IPFS MFS.
 */
export class IPFSMfsProvider extends FdpConnectProvider {
  constructor(private host: string = 'http://localhost:5001/api/v0/') {
    super({
      name: 'IPFSMfsProvider',
    })
  }

  initialize(options: any): void {
    super.initialize(options)

    this.filesystemDriver = new IpfsMfsProviderDriver(options)
  }
}
```

## API

See `/docs` for generated TypeScript documentation.

## Maintainers

- [molekilla](https://github.com/molekilla)

## License

[MIT](./LICENSE)