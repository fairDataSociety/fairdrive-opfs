import { Mount } from './provider'
import { ProviderDriver } from './provider-driver'

// FairDrive adapter options
export interface FdpAdapterOptions {
  mount: Mount
  driver: ProviderDriver
}
