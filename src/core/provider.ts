import { getOriginPrivateDirectory } from 'file-system-access'
import {
  FileSystemFileHandleAdapter,
  FileSystemFolderHandleAdapter,
  WriteChunk,
} from 'file-system-access/lib/interfaces'

const { GONE } = errors
import { errors } from 'file-system-access/lib/util.js'
import { Subject } from 'rxjs'
import { FileSync } from './file-sync'
import { ProviderDriver } from './provider-driver'

// Entries represents a list of files and directories
export interface Entries {
  files: Array<string>
  dirs: Array<string>
  mount: Mount
}

/**
 * FdpConnectProvider is the base class for all providers.
 */
export abstract class FdpConnectProvider {
  onMount: Subject<Mount> = new Subject()
  mount: Mount
  constructor(private config: any) {}

  filesystemDriver!: ProviderDriver
  initialize(options: any) {
    Object.assign(this, options)
  }

  /**
   * Get the current mount point.
   * @returns Current mount point
   */
  getCurrentMount() {
    return this.mount
  }

  /**
   * getFSHandler returns a FileSystemDirectoryHandle for the given provider.
   * @param mount - mount point
   * @returns a FileSystemDirectoryHandle
   */
  async getFSHandler(mount: Mount) {
    const adapter = await import('./adapter') // FdpConnectAdapter(mount, this.filesystemDriver)

    this.mount = mount
    this.onMount.next(mount)

    return getOriginPrivateDirectory(adapter, { mount, driver: this.filesystemDriver })
  }

  /**
   * getTransferHandler returns a FileSync for the given provider.
   * @returns a FileSync
   */
  getTransferHandler(): FileSync {
    return new FileSync(this.filesystemDriver)
  }
}

const File = globalThis.File

/**
 * Mount represents a logical mount point for a provider to be mounted on.
 */
export interface Mount {
  // path to the mount point
  path: string
  // name of the mount point
  name: string
}

class Sink implements UnderlyingSink<WriteChunk> {
  private file: File

  driver: ProviderDriver
  mount: Mount

  constructor(mount: Mount, driver: ProviderDriver, file: File) {
    this.mount = mount
    this.driver = driver
    this.file = file
  }

  /**
   * Returns true if the file exists, else false
   * @param key
   * @param options
   * @returns
   */
  async has(key: string): Promise<boolean> {
    try {
      return this.driver.exists(key, this.mount)
    } catch (e) {
      return false
    }
  }

  /**
   * Write a chunk to the file
   */
  async write(chunk: WriteChunk) {
    this.file = chunk as File
  }

  /**
   * Close the file
   */
  async close() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await this.driver.upload(this.file, this.mount, {})
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  }
}

// FS File Handle
export class FileHandle implements FileSystemFileHandleAdapter {
  public readonly name: string
  public readonly kind = 'file'
  mount: Mount
  driver: ProviderDriver
  public onclose?(self: this): void
  writable = true

  constructor(mount: Mount, driver: ProviderDriver, name: string) {
    this.mount = mount
    this.driver = driver
    this.name = name
  }

  /**
   * Get the file
   */
  async getFile() {
    try {
      const data = await this.driver.download(`${this.mount.path}${this.name}`, this.mount, {})

      return new File([data.buffer], this.name)
    } catch (e) {
      throw new DOMException(...GONE)
    }
  }

  /**
   * Create a writable stream
   */
  async createWritable(opts?: FileSystemCreateWritableOptions) {
    let file
    if (opts && !opts.keepExistingData) {
      file = new File([], this.name)
    } else {
      file = await this.getFile()
    }

    return new Sink(this.mount, this.driver, file)
  }

  /**
   * Check if the file is the same as the other file
   */
  async isSameEntry(other: FileHandle) {
    return this.name === other.name
  }
}

// FS Folder Handle
export class FolderHandle implements FileSystemFolderHandleAdapter {
  public readonly path: string
  public readonly kind = 'directory'
  readonly name: string

  mount: Mount
  writable = true
  readable = true
  driver: ProviderDriver

  constructor(mount: Mount, driver: ProviderDriver) {
    this.mount = mount
    this.driver = driver
    this.name = this.mount.name
    this.path = this.mount.path
  }

  /**
   * Entries returns a list of files and directories
   */
  async *entries() {
    const entries = await this.driver.read(this.mount)
    if (entries && entries.dirs && entries.dirs.length > 0) {
      for (const entry of entries.dirs) {
        yield [entry, new FolderHandle(this.mount, this.driver)] as [string, FolderHandle]
      }
    }

    if (entries && entries.files && entries.files.length > 0) {
      for (const entry of entries.files) {
        yield [entry, new FileHandle(this.mount, this.driver, entry)] as [string, FileHandle]
      }
    }
  }

  /**
   * Check if the folder is the same as the other folder
   */
  async isSameEntry(other: FolderHandle) {
    return this.path === other.path
  }

  /**
   * GetDirectoryHandle returns a directory handle
   */
  async getDirectoryHandle(name: string, opts: FileSystemGetDirectoryOptions = {}) {
    return new Promise<FolderHandle>(async (resolve, reject) => {
      if (opts.create) {
        await this.driver.createDir(`${this.mount.path}${name}`, this.mount)

        resolve(new FolderHandle(this.mount, this.driver))
      } else {
        try {
          const entries = await this.driver.read(this.mount)

          if (entries.files.length > 0 || entries.dirs.length > 0) {
            resolve(new FolderHandle(this.mount, this.driver))
          }
        } catch (e) {
          reject(new DOMException(...GONE))
        }
      }
    })
  }

  /**
   * GetFileHandle returns a file handle
   */
  async getFileHandle(name: string, opts: FileSystemGetFileOptions = {}) {
    return new Promise<FileHandle>(async (resolve, reject) => {
      try {
        if (opts.create) {
          resolve(new FileHandle(this.mount, this.driver, name))
        } else {
          resolve(new FileHandle(this.mount, this.driver, name))
        }
      } catch (e) {
        reject(new DOMException(...GONE))
      }
    })
  }

  /**
   * Removes a file
   */
  async removeEntry(name: string, opts: FileSystemRemoveOptions = {}) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await this.driver.delete(`${this.mount.path}${name}`, this.mount)
      } catch (e) {
        reject(new DOMException(...GONE))
      }
    })
  }
}
