import { ModuleConfig } from './module-config'
import { FdpConnectProvider } from './provider'

/**
 * FdpConnectModule is the main entry point for the Fairdrive Connect library.
 */
export class FdpConnectModule {
  // connected providers
  bindings: Map<string, FdpConnectProvider> = new Map()
  constructor(public config: ModuleConfig) {}

  /**
   * Connects a provider to the module.
   * @param providerName Provider name
   * @returns A provider instance
   */
  async connect(providerName: string) {
    const provider = await this.config.providers[providerName].driver
    const providerInstance = new provider[this.config.providers[providerName].type]()
    providerInstance.initialize(this.config.providers[providerName].options)

    this.bindings.set(providerName, providerInstance)

    return providerInstance
  }

  /**
   * Gets a connected provider.
   * @param providerName Provider name
   * @returns A provider instance
   */
  getConnectedProviders<T extends FdpConnectProvider>(providerName: string): T {
    return this.bindings.get(providerName) as T
  }
}
