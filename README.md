# fairdrive-connector
Fairdrive Connector - integrate data sources from Web 2.0 or Web 3.0


## How to use
```typescript
import {
  FdpConnectModule,
} from '@fairdatasociety/core';
import {
  FairosProvider,
} from '@fairdatasociety/providers';

// Create a FdpConnectModule
module = new FdpConnectModule({
  providers: {
    fairos: {
      options: {
        host: 'https://fairos.staging.fairdatasociety.org/',
      },
      capabilities: ['filesystem:w3c', 'data:graphql', 'data:sql'],
      provider: '@fairdatasociety/providers/fairos',
    },
  },
})

// Connect
const fairosConnector = await module.connect<FairosProvider>('fairos', FairosProvider)

// Login
await fairosConnector.userLogin(username, password)

// list all mounts / pods
const mounts = await fairosConnector.listMounts()

// W3C FileSystem


// Graphql

// Arrow SQL
```


MIT License