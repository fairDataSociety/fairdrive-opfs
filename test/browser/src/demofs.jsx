import * as React from 'react'
import { showOpenFilePicker } from 'native-file-system-adapter'
import { useEffect } from 'react'
import { useCallback } from 'react'
import { fileSave } from 'browser-fs-access'
import { FdpConnectModule, IPFSMfsProvider } from '@fairdatasociety/fairdrive-opfs'
import { FullFileBrowser } from 'chonky'
import LinearProgress from '@mui/material/LinearProgress'
import Snackbar from '@mui/material/Snackbar'
import MuiAlert from '@mui/material/Alert'

import Grid from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import DeleteIcon from '@mui/icons-material/Delete'
import ButtonGroup from '@mui/material/ButtonGroup'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import StorageIcon from '@mui/icons-material/Storage'
import SettingsIcon from '@mui/icons-material/Settings'
import Button from '@mui/material/Button'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import { usePopupState } from 'material-ui-popup-state/hooks'
import * as providers from './providers'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import InboxIcon from '@mui/icons-material/Inbox'
import DraftsIcon from '@mui/icons-material/Drafts'

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

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
  const [providerSettings, setProviderSettings] = React.useState(providers)
  const [showError, setShowError] = React.useState(false)
  const [openMount, setOpenMount] = React.useState(false)

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

  const getProviderType = provider => {
    if (provider === 'ipfs') {
      return IPFSMfsProvider
    }
    if (provider === 'fairos') {
      return FairosProvider
    }
  }

  useEffect(() => {
    async function getPods() {
      const module = new FdpConnectModule(providerSettings)
      const conn = await module.connect(
        providerSettings.selectedProvider,
        getProviderType(providerSettings.selectedProvider),
      )

      setConnector(conn)
      const podList = [{ name: 'root', path: '/' }]
      setPods(podList)
    }
    try {
      setLoading(true)
      getPods()
    } catch (e) {
      setShowError(true)
      setLoadingMessage(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  async function handlePodChange(e) {
    setLoadingMessage(`Loading mount ${e.target.value}...`)
    setLoading(true)

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
  }
  const popupState = usePopupState({ variant: 'popover', popupId: 'demoMenu' })

  async function createFolder() {
    setLoadingMessage(`Creating folder ${currentPath}${folderName}...`)
    setLoading(true)

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
              <Button disabled={!isMounted} startIcon={<CreateNewFolderIcon />}></Button>
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
        <nav aria-label="main mailbox folders">
          <List>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemText primary="Fairos" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton>
                <ListItemText primary="IPFS" />
              </ListItemButton>
            </ListItem>
          </List>
        </nav>
        <DialogActions>
          <Button onClick={handleCloseSettings}>Close</Button>
          <Button onClick={handleClose}>Apply</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openMount} onClose={handleCloseMount}>
        <DialogTitle>Mounts</DialogTitle>
        <DialogContent>
          <DialogContentText>Select a mount to connect to </DialogContentText>
        </DialogContent>
        <nav aria-label="main mailbox folders">
          <List>
            <ListItem disablePadding>
              {pods.map(pod => (
                <ListItemButton>
                  <ListItemText primary={pod.name} onClick={handlePodChange} />
                </ListItemButton>
              ))}
            </ListItem>
          </List>
        </nav>
        <DialogActions>
          <Button onClick={handleCloseMount}>Close</Button>
          <Button onClick={handleClose}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
