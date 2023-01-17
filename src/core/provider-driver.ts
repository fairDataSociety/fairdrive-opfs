import { Mount, Entries } from './provider'

/**
 * ProviderDriver is the interface that all providers must implement that adheres for W3C FileSystem API.
 */
export interface ProviderDriver {
  /**
   * Reuturns true if the file or directory exists
   * @param name - The name of the file or directory
   * @param mount - mount point
   * @returns A boolean value indicating whether the file or directory exists
   */
  exists: (name: string, mount: Mount) => Promise<boolean>
  createDir: (name: string, mount: Mount) => Promise<boolean>
  /**
   * Delete a file or directory
   * @param name - name of the file or directory
   * @param mount - mount point
   * @returns Returns true if the file or directory was deleted, else false
   */
  delete: (name: string, mount: Mount) => Promise<boolean>
  /**
   * Read entries from a mount point
   * @param mount - mount point
   * @returns Entries
   */
  read: (mount: Mount) => Promise<Entries>
  /**
   * Download entries from a mount point
   * @param name - name of the file
   * @param mount - mount point
   * @param options - options
   * @returns Result
   */
  download: (name: string, mount: Mount, options: any) => Promise<any>
  /**
   * Upload entries from a file
   * @param file - file to upload
   * @param mount - mount point
   * @param options - options
   * @returns Result
   */
  upload: (file: File, mount: Mount, options: any) => Promise<any>
}
