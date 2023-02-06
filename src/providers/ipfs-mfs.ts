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
      // eslint-disable-next-line no-console
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
        entries.dirs.push(i.name)
      } else {
        entries.files.push(i.name)
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
    for await (const res of this.client.files.read(`${mount.path}${id}`, options)) {
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
    const res = this.client.files.write(`${mount.path}${file.name}`, file, { create: true })

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

  async listMounts(): Promise<Mount[]> {
    return [{ name: 'root', path: '/' }]
  }
}
