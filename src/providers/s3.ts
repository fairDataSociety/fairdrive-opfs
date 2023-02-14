import { Mount, Entries, FdpConnectProvider } from '../core/provider'
import { ProviderDriver } from '../core/provider-driver'
import AWSClientS3 from 'aws-client-s3'
/**
 * S3ProviderDriver is the driver for AWS S3 provider.
 */
export class S3ProviderDriver implements ProviderDriver {
  host: string
  client: AWSClientS3
  constructor(options: { host: string; region: string; accessKeyId: string; secretAccessKey: string }) {
    this.host = options.host
    this.client = new AWSClientS3({
      region: options.region,
      credentials: { accessKeyId: 'S3RVER', secretAccessKey: 'S3RVER' },
    })
  }
  /**
   * Verify if a file exists
   * @param path - path to the file
   * @param mount - mount to check
   * @returns Returns true if the file exists, else false
   */
  async exists(path: string, mount: Mount): Promise<boolean> {
    return false
  }

  /**
   * Creates a directory
   * @param name - directory name
   * @param mount - mount to check
   * @returns Returns true if the directory created, else false
   */
  async createDir(name: string, mount: Mount): Promise<boolean> {
    try {
      const createBucketResult = await this.client.createBucket(name)

      return true
    } catch (e) {
      return false
    }
  }

  async delete(filePath: string, mount: Mount): Promise<boolean> {
    try {
      await this.client.deleteFile({
        bucket: mount.path,
        key: filePath,
      })

      return true
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)

      return false
    }
  }

  async read(mount: Mount): Promise<Entries> {
    const listObjectsResult = await this.client.listBucketObjects(mount.path)
    const entries = {
      dirs: [],
      files: [],
      mount,
    } as Entries

    for (const i of listObjectsResult.Contents) {
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
    const fileStream = await this.client.readFile(
      {
        bucket: mount.path,
        key: id,
      },
      'buffer',
    )

    return Buffer.from(fileStream)
  }

  /**
   * Upload a file
   * @param file - file to upload
   * @param mount - mount to upload to
   * @param options - options
   */
  async upload(file: File, mount: Mount, options = {}): Promise<any> {
    const buf = await file.arrayBuffer()
    const res = await this.client.uploadFile(Buffer.from(buf), {
      bucket: mount.path,
      key: file.name,
    })

    return res
  }
}
/**
 * S3Provider is the provider for AWS S3.
 */
export class S3Provider extends FdpConnectProvider {
  constructor(private host: string = 'http://localhost:4568/') {
    super({
      name: 'S3Provider',
    })
  }

  initialize(options: any): void {
    super.initialize(options)

    this.filesystemDriver = new S3ProviderDriver(options)
  }

  async listMounts(): Promise<Mount[]> {
    return [{ name: 'root', path: '/' }]
  }
}
