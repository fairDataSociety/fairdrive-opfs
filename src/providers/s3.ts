import { Mount, Entries, FdpConnectProvider } from '../core/provider'
import { ProviderDriver } from '../core/provider-driver'
import * as Minio from 'minio'
/**
 * S3ProviderDriver is the driver for AWS S3 provider.
 */
export class S3ProviderDriver implements ProviderDriver {
  client: Minio.Client
  region: string
  constructor(options: {
    port: number
    endpoint: string
    region: string
    useSSL: boolean
    accessKeyId: string
    secretAccessKey: string
  }) {
    this.client = new Minio.Client({
      // region: options.region,
      endPoint: options.endpoint,
      port: options.port,
      useSSL: options.useSSL,
      accessKey: options.accessKeyId,
      secretKey: options.secretAccessKey,
    })
    this.region = options.region
  }
  /**
   * Verify if a file exists
   * @param path - path to the file
   * @param mount - mount to check
   * @returns Returns true if the file exists, else false
   */
  async exists(path: string, mount: Mount): Promise<boolean> {
    // Get stat information for my-objectname.
    const stat = await this.client.statObject(mount.name, path)

    return stat.size > 0
  }

  /**
   * Creates a directory
   * @param name - directory name
   * @param mount - mount to check
   * @returns Returns true if the directory created, else false
   */
  async createDir(name: string, mount: Mount): Promise<boolean> {
    try {
      const createBucketResult = await this.client.makeBucket(name, this.region)

      return true
    } catch (e) {
      return false
    }
  }

  async delete(filePath: string, mount: Mount): Promise<boolean> {
    try {
      await this.client.removeObject(mount.name, filePath)

      return true
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)

      return false
    }
  }

  async read(mount: Mount): Promise<Entries> {
    return new Promise(async (resolve, reject) => {
      const res = await this.client.listObjects(mount.name, '', true)
      const entries = {
        dirs: [],
        files: [],
        mount,
      } as Entries

      res.on('data', i => {
        entries.files.push(i.name)
      })
      res.on('error', e => {
        reject(e)
      })
      res.on('end', e => {
        resolve(entries)
      })
    })
  }

  /**
   * Download a file
   * @param id - id of the file
   * @param mount - mount to download the file from
   * @param options - options
   * @returns
   */
  async download(id: string, mount: Mount, options = {}): Promise<any> {
    const fileStream = await this.client.getObject(mount.name, id.substring(1))
    const buffers = []

    for await (const data of fileStream) {
      buffers.push(data)
    }

    return Buffer.concat(buffers)
  }

  /**
   * Upload a file
   * @param file - file to upload
   * @param mount - mount to upload to
   * @param options - options
   */
  async upload(file: File, mount: Mount, options = {}): Promise<any> {
    const buf = await file.arrayBuffer()
    const res = await this.client.putObject(mount.name, file.name, Buffer.from(buf))

    return res
  }
}
/**
 * S3Provider is the provider for AWS S3.
 */
export class S3Provider extends FdpConnectProvider {
  client: Minio.Client
  constructor(private host: string = 'http://localhost:4568/') {
    super({
      name: 'S3Provider',
    })
  }

  initialize(options: any): void {
    super.initialize(options)

    const s3 = new S3ProviderDriver(options)
    this.client = s3.client
    this.filesystemDriver = s3
  }

  async listMounts(): Promise<Mount[]> {
    const listBucketsResult = await this.client.listBuckets()

    return listBucketsResult.map(i => {
      return { name: i.name, path: '/' }
    })
  }
}
