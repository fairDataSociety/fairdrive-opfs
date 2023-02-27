import { Subject } from 'rxjs'
import { Mount } from './provider'
import { ProviderDriver } from './provider-driver'

/**
 * FileSync is a class that handles file transfers between mounts and providers.
 * It is used by the FdpConnectProvider to handle file transfers.
 */
export class FileSync {
  onStart: Subject<{ file: File; mount: Mount }> = new Subject()
  onComplete: Subject<{ result: any }> = new Subject()
  onError: Subject<Error> = new Subject()

  /**
   * Creates a new FileSync instance.
   * @param transferToProvider ProviderDriver to transfer files to
   * @returns FileSync instance
   */
  constructor(private transferToProvider: ProviderDriver) {}

  /**
   * Moves a file from one mount to another
   * @param file File to transfer
   * @param mount Destination mount
   * @param onProgress
   */
  async transfer(file: File, mount: Mount) {
    let res = {}
    try {
      this.onStart.next({ file, mount })
      res = await this.transferToProvider.upload(file, mount, {})
    } catch (e) {
      this.onError.next(e)
    }

    this.onComplete.next({ result: res })
  }
}
