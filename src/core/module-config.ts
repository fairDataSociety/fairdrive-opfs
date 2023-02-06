/**
 * ModuleConfig is the configuration object for the FdpConnectModule.
 */
export class ModuleConfig {
  providers: Record<string, ProviderConfig> = {}
}

export class ProviderConfig {
  options: Record<string, string | object> = {}
  driver = ''
  type = ''
}
