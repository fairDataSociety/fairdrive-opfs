import * as React from 'react'
import { showOpenFilePicker } from 'native-file-system-adapter'
import { useCallback } from 'react'
import { fileSave } from 'browser-fs-access'
import { FdpConnectModule } from '@fairdatasociety/fairdrive-opfs'
import { FullFileBrowser } from 'chonky'
import LinearProgress from '@mui/material/LinearProgress'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'

import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TextField from '@mui/material/TextField'

import Grid from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import DeleteIcon from '@mui/icons-material/Delete'
import ButtonGroup from '@mui/material/ButtonGroup'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import CheckIcon from '@mui/icons-material/Check'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import StorageIcon from '@mui/icons-material/Storage'
import SettingsIcon from '@mui/icons-material/Settings'
import Button from '@mui/material/Button'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import { AccordionActions } from '@mui/material'

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

const providers = {
  selectedProvider: '',
  providers: {
    s3: {
      options: {
        host: 'http://localhost:4568',
      },
      driver: import('@fairdatasociety/fairdrive-opfs'),
      type: 'S3Provider',
    },
    ipfs: {
      options: {
        host: 'http://localhost:5001',
      },
      driver: import('@fairdatasociety/fairdrive-opfs'),
      type: 'IPFSMfsProvider',
    },
    fairos: {
      options: {
        username: '',
        password: '',
        host: 'https://fairos.fairdatasociety.org/',
      },
      driver: import('@fairdatasociety/fairdrive-opfs'),
      type: 'FairosProvider',
    },
  },
}

export const DemoFSBrowser = ({ id, name }) => {
  const [currentPath, setCurrentPath] = React.useState('/')
  const [items, setItems] = React.useState([])
  const [pods, setPods] = React.useState([])
  const [folderName, setFolderName] = React.useState('')
  const [loadingMessage, setLoadingMessage] = React.useState('Loading...')
  const [loading, setLoading] = React.useState(false)
  const [podItem, setPod] = React.useState({ name: '' })
  const [folderChain, setFolderChain] = React.useState([])
  const [isMounted, setIsMounted] = React.useState(false)
  const [selectedFileHandle, setSelectedFileHandle] = React.useState(null)
  const [connector, setConnector] = React.useState(null)
  const [currentFolderHandle, setCurrentFolderHandle] = React.useState(null)
  const [isSelected, setIsSelected] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [openSettings, setOpenSettings] = React.useState(false)
  const [defaultProvider, setDefaultProvider] = React.useState('')
  const [providerSettings, setProviderSettings] = React.useState(providers)
  const [showError, setShowError] = React.useState(false)
  const [openMount, setOpenMount] = React.useState(false)
  const [openCreateFolder, setOpenCreateFolder] = React.useState(false)

  const handleOpenSettings = () => {
    setOpenSettings(true)
  }

  const handleCloseSettings = () => {
    setOpenSettings(false)
  }

  const handleOpenMount = () => {
    setOpenMount(true)
  }

  const handleCloseMount = () => {
    setOpenMount(false)
  }

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }

    setOpen(false)
  }

  async function handleApplyProvider(provider) {
    try {
      setLoading(true)
      const module = new FdpConnectModule(providerSettings)
      const conn = await module.connect(provider)

      setConnector(conn)
      if (provider === 'fairos') {
        await conn.userLogin(
          providerSettings.providers.fairos.options.username,
          providerSettings.providers.fairos.options.password,
        )
      }
      const podList = await conn.listMounts()
      setPods(podList)
    } catch (e) {
      setShowError(true)
      setLoadingMessage(e.message)
    } finally {
      setLoading(false)
      handleCloseSettings()
    }
  }

  async function handlePodChange(e) {
    setLoadingMessage(`Loading mount ${e.target.value}...`)
    setLoading(true)

    await connector.podOpen({
      name: e.target.value,
      path: '/',
    })
    const rootHandle = await connector.getFSHandler({
      name: e.target.value,
      path: '/',
    })

    setCurrentFolderHandle(rootHandle)
    setIsMounted(true)
    if (currentPath === '/') {
      setFolderChain([
        {
          id: 'root',
          name: '/',
          isDir: true,
        },
      ])
    } else {
      const folders = currentPath.split('/').map(path => ({
        id: path,
        name: path,
        isDir: true,
      }))

      setFolderChain(folders)
    }
    const files = []

    for await (let [name, entry] of rootHandle.entries()) {
      if (entry.kind === 'directory') {
        const item = { id: name, name: name, isDir: true, handle: entry }
        files.push(item)
      } else {
        const item = { id: name, name: name, isDir: false, handle: entry }
        files.push(item)
      }
    }

    setPod({ ...e.target.value })
    setItems(files)
    setLoading(false)
    setLoadingMessage('')
    setIsSelected(false)
    handleCloseMount()
  }

  async function handleCreateFolder() {
    setLoadingMessage(`Creating folder ${currentPath}${folderName}...`)
    setLoading(true)

    await currentFolderHandle.getDirectoryHandle(folderName, { create: true })

    setCurrentPath(`${currentPath}${folderName}/`)
    setLoadingMessage('')
    setLoading(false)
  }

  async function handleFileDownload() {
    const h = selectedFileHandle.handle
    const blob = h.getFile()
    // Save a file.
    fileSave(blob, {
      fileName: h.name,
      // extensions: ['.png'],
    })
  }

  async function handleFileUpload() {
    setLoading(true)
    setLoadingMessage('Uploading file...')

    // request user to select a file
    const [picker] = await showOpenFilePicker({
      types: [], // default
      multiple: false, // default
      excludeAcceptAllOption: false, // default
      _preferPolyfill: false, // default
    })

    // returns a File Instance
    const file = await picker.getFile()

    const fileHandle = await currentFolderHandle.getFileHandle(file.name, { create: true })
    const writable = await fileHandle.createWritable({ keepExistingData: false })
    await writable.write(file)
    await writable.close()

    const files = []

    for await (let [name, entry] of currentFolderHandle.entries()) {
      if (entry.kind === 'directory') {
        const item = { id: name, name: name, isDir: true, handle: entry }
        files.push(item)
      } else {
        const item = { id: name, name: name, isDir: false, handle: entry }
        files.push(item)
      }
    }

    setItems(files)

    setLoading(false)
    setLoadingMessage('')
  }

  async function handleDeleteFile() {
    setLoading(true)
    setLoadingMessage('Removing file...')

    const file = selectedFileHandle.handle

    await currentFolderHandle.removeEntry(file.name)

    const files = []

    setItems([])
    for await (let [name, entry] of currentFolderHandle.entries()) {
      if (entry.kind === 'directory') {
        const item = { id: name, name: name, isDir: true, handle: entry }
        files.push(item)
      } else {
        const item = { id: name, name: name, isDir: false, handle: entry }
        files.push(item)
      }
    }

    setItems(files)
    setLoading(false)
    setLoadingMessage('')
  }

  const handleAction = podItem =>
    useCallback(
      data => {
        setSelectedFileHandle(data.payload.file)
        setIsSelected(true)
      },
      [podItem, loading, selectedFileHandle],
    )

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2} columns={12}>
        <Grid xs={6}>
          <div>
            <ButtonGroup variant="contained" aria-label="outlined primary button group">
              <Button startIcon={<SettingsIcon />} variant="contained" onClick={handleOpenSettings}>
                Settings
              </Button>
              <Button startIcon={<StorageIcon />} variant="contained" onClick={handleOpenMount}>
                Mounts
              </Button>
              <div></div>
              <Button
                disabled={!isMounted}
                onClick={handleFileUpload}
                startIcon={<FileUploadIcon />}
              ></Button>
              <Button
                disabled={!isMounted}
                onClick={e => {
                  setOpenCreateFolder(true)
                }}
                startIcon={<CreateNewFolderIcon />}
              ></Button>
              <Button
                onClick={handleFileDownload}
                disabled={!isSelected}
                startIcon={<FileDownloadIcon />}
              ></Button>
              <Button onClick={handleDeleteFile} disabled={!isSelected} startIcon={<DeleteIcon />}></Button>
            </ButtonGroup>
          </div>
        </Grid>
        <Grid xs={6}></Grid>
        <Grid xs={6}>
          <FullFileBrowser onFileAction={handleAction(podItem)} files={items} folderChain={folderChain} />
        </Grid>
        <Grid xs={6}>D</Grid>
        <Grid xs={12}>
          <Snackbar open={loading} autoHideDuration={6000}>
            <Alert onClose={handleClose} severity="success" sx={{ width: '100%' }}>
              {loadingMessage}
            </Alert>
          </Snackbar>
          <Snackbar open={showError} autoHideDuration={6000}>
            <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
              {loadingMessage}
            </Alert>
          </Snackbar>
          {loading && <LinearProgress />}
        </Grid>
      </Grid>
      <Dialog open={openSettings} onClose={handleCloseSettings}>
        <DialogTitle>Providers settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Select and configure your providers. You can add multiple providers and switch between them.
          </DialogContentText>
        </DialogContent>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Fairos</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div>
              <TextField
                required
                onChange={e => {
                  providerSettings.providers.fairos.options.host = e.target.value
                }}
                id="standard-required"
                label="Fairos RPC"
                defaultValue={providerSettings.providers.fairos.options.host}
                variant="standard"
              />
            </div>
            <div>
              <TextField
                required
                onChange={e => {
                  providerSettings.providers.fairos.options.username = e.target.value
                }}
                id="standard-required"
                label="Username"
                defaultValue={providerSettings.providers.fairos.options.username}
                variant="standard"
              />
            </div>
            <div>
              <TextField
                onChange={e => {
                  providerSettings.providers.fairos.options.password = e.target.value
                }}
                id="standard-password-input"
                label="Password"
                type="password"
                autoComplete="current-password"
                variant="standard"
              />
            </div>
          </AccordionDetails>
          <AccordionActions>
            <Button
              onClick={e => {
                handleApplyProvider('fairos')
              }}
              startIcon={defaultProvider === 'fairos' ? <CheckIcon /> : <></>}
              size="small"
            >
              Set as default
            </Button>
          </AccordionActions>
        </Accordion>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel2a-content"
            id="panel2a-header"
          >
            <Typography>IPFS</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div>
              <TextField
                onChange={e => {
                  providerSettings.providers.ipfs.options.host = e.target.value
                  setProviderSettings(providerSettings)
                }}
                required
                id="standard-required"
                label="IPFS RPC"
                defaultValue={providerSettings.providers.ipfs.options.host}
                variant="standard"
              />
            </div>
          </AccordionDetails>
          <AccordionActions>
            <Button
              onClick={e => {
                handleApplyProvider('ipfs')
              }}
              startIcon={defaultProvider === 'ipfs' ? <CheckIcon /> : <></>}
              size="small"
            >
              Set as default
            </Button>
          </AccordionActions>
        </Accordion>

        <DialogActions>
          <Button onClick={handleCloseSettings}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openMount} onClose={handleCloseMount}>
        <DialogTitle>Mounts</DialogTitle>
        <DialogContent>
          <DialogContentText>Select a mount to connect to </DialogContentText>
        </DialogContent>
        <nav>
          <select onChange={handlePodChange} id="pods">
            <option defaultValue={''}>Select</option>
            {pods.map(pod => (
              <option value={pod.name} key={pod.name}>
                {pod.name}
              </option>
            ))}
          </select>
        </nav>
        <DialogActions>
          <Button onClick={handleCloseMount}>Close</Button>
          <Button onClick={handleClose}>Apply</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openCreateFolder} onClose={e => setOpenCreateFolder(false)}>
        <DialogTitle>Create folder</DialogTitle>
        <DialogContent>
          <DialogContentText>Set folder name</DialogContentText>
        </DialogContent>
        <div>
          <TextField required label="Name" variant="standard" onChange={e => setFolderName(e.target.value)} />
        </div>
        <DialogActions>
          <Button
            onClick={e => {
              setOpenCreateFolder(false)
            }}
          >
            Close
          </Button>
          <Button onClick={handleCreateFolder}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
