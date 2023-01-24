import { Mount, Entries, FdpConnectProvider } from '../core/provider'
import { ProviderDriver } from '../core/provider-driver'
import { FdpStorage } from '@fairdatasociety/fdp-storage'
/**
 * FdpStorageProviderDriver is the driver for the FDP Storage provider.
 */
export class FdpStorageProviderDriver implements ProviderDriver {
  client: FdpStorage
  constructor(options: { fdp: FdpStorage }) {
    this.client = options.fdp
  }
  /**
   * Verify if a file exists
   * @param path - path to the file
   * @param mount - mount to check
   * @returns Returns true if the file exists, else false
   */
  async exists(path: string, mount: Mount): Promise<boolean> {
    // TODO: check if this is the correct way to check if a file exists
    return true
  }

  /**
   * Creates a directory
   * @param name - directory name
   * @param mount - mount to check
   * @returns Returns true if the directory created, else false
   */
  async createDir(name: string, mount: Mount): Promise<boolean> {
    try {
      await this.client.directory.create(name, `${mount.path}${name}`)

      return true
    } catch (e) {
      throw e
    }
  }

  async delete(filePath: string, mount: Mount): Promise<boolean> {
    try {
      await this.client.file.delete(mount.name, `${mount.path}${filePath}`)

      return true
    } catch (e) {
      throw e
    }
  }

  async read(mount: Mount): Promise<Entries> {
    const entries = {
      dirs: [],
      files: [],
      mount,
    } as Entries
    const items = await this.client.directory.read(mount.name, mount.path)
    if (entries && items.getDirectories().length > 0) {
      for (const entry of items.getDirectories()) {
        entries.dirs.push(entry.name)
      }
    }
    if (entries && entries.files.length > 0) {
      for (const entry of items.getFiles()) {
        entries.files.push(entry.name)
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
    const res = await this.client.file.downloadData(mount.name, `${mount.path}${id}`)

    return res.buffer
  }

  /**
   * Upload a file
   * @param file - file to upload
   * @param mount - mount to upload to
   * @param options - options
   */
  async upload(file: File, mount: Mount, options = {}): Promise<any> {
    const buffer = await file.arrayBuffer()
    const res = await this.client.file.uploadData(
      mount.name,
      `${mount.path}${file.name}`,
      Buffer.from(buffer),
    )

    return res
  }
}
export interface FdpStorageProviderConfig {
  beeUrl: string
  postageBatchId: string
  ensConfig: any
}

export class FdpStorageProvider extends FdpConnectProvider {
  client: FdpStorage
  constructor() {
    super({
      name: 'FdpStorageProvider',
    })
  }

  initialize(options: FdpStorageProviderConfig): void {
    super.initialize(options)
    this.client = new FdpStorage(options.beeUrl, options.postageBatchId, options.ensConfig)
    this.filesystemDriver = new FdpStorageProviderDriver({ fdp: this.client })
  }
  /**
   * Login a user
   * @param user - username
   * @param pass - password
   * @returns Returns a promise with the response
   */
  async userLogin(user: string, pass: string) {
    await this.client.login(user, pass)
  }

  async listMounts(): Promise<Mount[]> {
    const podList = await this.client.personalStorage.list()

    if (podList.getPods().length > 0) {
      return podList.getPods().map((name: string) => {
        return {
          name,
          path: '/',
        }
      })
    } else {
      return []
    }
  }
}
