import { Adapter } from 'file-system-access/lib/interfaces'
import { FdpAdapterOptions } from './adapter-options'
import { FolderHandle } from './provider'

/**
 * FdpConnectAdapter is a function that returns a promise that resolves to a FolderHandle
 * @param mount Mount point
 * @param driver Driver to use
 * @returns A promise that resolves to a FolderHandle
 */
const FdpConnectAdapter: Adapter<FdpAdapterOptions> = async (options: FdpAdapterOptions) =>
  new Promise(resolve => {
    resolve(new FolderHandle(options.mount, options.driver))
  })

export default FdpConnectAdapter
