import fetch from 'node-fetch'
import { Mount, Entries, FdpConnectProvider } from '../core/provider'
import { ProviderDriver } from '../core/provider-driver'
/**
 * FairosProviderDriver is the driver for the FairOS provider.
 */
export class FairosProviderDriver implements ProviderDriver {
  host: any
  constructor(options: { host: string }) {
    this.host = options.host
  }
  /**
   * Verify if a file exists
   * @param path - path to the file
   * @param mount - mount to check
   * @returns Returns true if the file exists, else false
   */
  async exists(path: string, mount: Mount): Promise<boolean> {
    const res = await fetch(`${this.host}v1/file/stat?filePath=${path}&podName=${mount.name}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (res.status === 200) {
      const data = await res.json()

      return data.filePath === path && data.podName === mount.name
    } else {
      return false
    }
  }

  async createDir(name: string, mount: Mount): Promise<any> {
    const data = {
      dirPath: name,
      podName: mount.name,
    }

    const res = await fetch(`${this.host}v1/dir/mkdir`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    return (await res.json()).dirPath === name
  }

  async delete(filePath: string, mount: Mount): Promise<any> {
    const data = {
      filePath,
      podName: mount.name,
    }

    const res = await fetch(`${this.host}v1/file/delete`, {
      method: 'DELETE',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    return (await res.json()).filePath === filePath
  }

  async read(mount: Mount): Promise<Entries> {
    const res = await fetch(`${this.host}v1/dir/ls?dirPath=${mount.path}&podName=${mount.name}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (res.status === 200) {
      const data = await res.json()

      return {
        dirs: (data.dirs || []).map((dir: any) => dir.name),
        files: (data.files || []).map((file: any) => file.name),
        mount,
      }
    } else {
      return {
        dirs: [],
        files: [],
        mount,
      }
    }
  }

  /**
   * Download a file
   * @param id - id of the file
   * @param mount - mount to download the file from
   * @param options - options
   * @returns
   */
  async download(id: string, mount: Mount): Promise<any> {
    const data = {
      filePath: id,
      podName: mount.name,
    }

    const res = await fetch(this.host + 'v1/file/download' + '?' + new URLSearchParams(data), {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(data),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const a = await res.arrayBuffer()

    return new Uint8Array(a)
  }

  /**
   * Upload a file
   * @param file - file to upload
   * @param mount - mount to upload to
   * @param options - options
   */
  async upload(file: File, mount: Mount, options = { overwrite: false, path: '/' }): Promise<any> {
    const formData = new FormData()

    formData.append('files', file)
    formData.set('podName', mount.name)
    formData.append('fileName', file.name) //"index.json");
    formData.set('dirPath', mount.path) // "/");
    formData.set('blockSize', '1Mb')

    if (options.overwrite === true) formData.set('overwrite', 'true')

    const res = await fetch(this.host + 'v1/file/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    return res.json()
  }
}
/**
 * FairosProvider is the provider for the FairOS provider.
 */
export class FairosProvider extends FdpConnectProvider {
  constructor(private host: string = 'https://fairos.dev.fairdatasociety.org/') {
    super({
      name: 'FairosProvider',
    })
  }

  /**
   * Initialize the provider
   * @param options options
   */
  initialize(options: any): void {
    super.initialize(options)

    this.onMount.subscribe(async (mount: Mount) => {
      if (mount.name !== this.getCurrentMount().name) {
        this.podClose(mount)
      }
      this.podOpen(mount)
    })

    this.filesystemDriver = new FairosProviderDriver(options)
  }
  /**
   * Login a user
   * @param user - username
   * @param pass - password
   * @returns Returns a promise with the response
   */
  async userLogin(user: string, pass: string) {
    const data = {
      userName: user,
      password: pass,
    }

    return await fetch(this.host + 'v2/user/login', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    })
  }

  /**
   * Verify if a user is logged in
   * @param username - username
   * @returns Returns a promise with the response
   */
  async userLoggedIn(username: string) {
    const data = {
      userName: username,
    }

    return await fetch(this.host + 'v1/user/isloggedin' + '?' + new URLSearchParams(data), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
  }

  async listMounts(): Promise<Mount[]> {
    const res = await fetch(`${this.host}v1/pod/ls?podName=`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (res.status === 200) {
      const data = await res.json()

      return data.pods.map((name: string) => {
        return {
          name,
          path: '/',
        }
      })
    } else {
      return []
    }
  }

  async podOpen(mount: Mount): Promise<void> {
    const res = await fetch(`${this.host}v1/pod/open`, {
      method: 'POST',
      body: JSON.stringify({ podName: mount.name }),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (res.status !== 200) {
      throw new Error(res.message)
    }
  }

  async podClose(mount: Mount): Promise<void> {
    const res = await fetch(`${this.host}v1/pod/close`, {
      method: 'POST',
      body: JSON.stringify({ podName: mount.name }),
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (res.status !== 200) {
      throw new Error(res.message)
    }
  }
}
