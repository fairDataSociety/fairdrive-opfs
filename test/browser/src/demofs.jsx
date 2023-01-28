import * as React from 'react'
import { showOpenFilePicker } from 'native-file-system-adapter'
import { useEffect } from 'react'
import { ChonkyActions } from 'chonky'
import { useCallback } from 'react'
import { fileSave } from 'browser-fs-access'
import { FdpConnectModule, IPFSMfsProvider } from '@fairdatasociety/fairdrive-opfs'
import { FullFileBrowser } from 'chonky'

import MenuItem from '@mui/material/MenuItem'
import Grid from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import DeleteIcon from '@mui/icons-material/Delete'
import ButtonGroup from '@mui/material/ButtonGroup'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import StorageIcon from '@mui/icons-material/Storage'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import { usePopupState, bindTrigger, bindMenu } from 'material-ui-popup-state/hooks'

const module = new FdpConnectModule({
  providers: {
    ipfs: {
      options: {
        host: 'http://localhost:5001',
      },
      provider: '@fairdatasociety/fairdrive-opfs/providers/ipfs-mfs',
    },
  },
})

export const DemoFSBrowser = ({ id, name }) => {
  const [currentPath, setCurrentPath] = React.useState('/')
  const [items, setItems] = React.useState([])
  const [pods, setPods] = React.useState([])
  const [folderName, setFolderName] = React.useState('')
  const [loadingMessage, setLoadingMessage] = React.useState('Loading pod...')
  const [loading, setLoading] = React.useState(false)
  const [podItem, setPod] = React.useState({ name: '' })
  const [folderChain, setFolderChain] = React.useState([])
  const myFileActions = [ChonkyActions.DeleteFiles, ChonkyActions.DownloadFiles]
  const [modalIsOpen, setIsOpen] = React.useState(false)
  const [selectedFileHandle, setSelectedFileHandle] = React.useState(null)
  const [connector, setConnector] = React.useState(null)
  const [currentFolderHandle, setCurrentFolderHandle] = React.useState(null)
  const [isSelected, setIsSelected] = React.useState(false)

  function openModal() {
    setIsOpen(true)
  }

  // eslint-disable-next-line
  function afterOpenModal() {}

  function closeModal() {
    setIsOpen(false)
  }

  useEffect(() => {
    async function getPods() {
      setLoading(true)
      const conn = await module.connect('ipfs', IPFSMfsProvider)

      setConnector(conn)
      const podList = [{ name: 'root', path: '/' }]
      setPods(podList)
      setLoading(false)
    }

    getPods()
  }, [])

  async function handlePodChange(e) {
    setLoadingMessage(`Loading pod ${e.target.value}...`)
    setLoading(true)

    const rootHandle = await connector.getFSHandler({
      name: e.target.value,
      path: '/',
    })

    setCurrentFolderHandle(rootHandle)
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
              <Button startIcon={<StorageIcon />} variant="contained" {...bindTrigger(popupState)}>
                Mounts
              </Button>
              <Menu {...bindMenu(popupState)}>
                {pods.map(pod => (
                  <MenuItem value={pod.name} key={pod.name} onClick={handlePodChange}>
                    {pod.name}
                  </MenuItem>
                ))}
              </Menu>
              <div></div>
              <Button onClick={handleFileUpload} startIcon={<FileUploadIcon />}>
                Upload
              </Button>
              <Button startIcon={<CreateNewFolderIcon />}></Button>
              <Button
                onClick={handleFileDownload}
                disabled={!isSelected}
                startIcon={<FileDownloadIcon />}
              ></Button>
              <Button onClick={handleDeleteFile} disabled={!isSelected} startIcon={<DeleteIcon />}></Button>
            </ButtonGroup>{' '}
          </div>
        </Grid>
        <Grid xs={6}></Grid>
        <Grid xs={6}>
          <FullFileBrowser
            onFileAction={handleAction(podItem)}
            files={items}
            folderChain={folderChain}
            fileActions={myFileActions}
          />
        </Grid>
        <Grid xs={6}>D</Grid>
      </Grid>
    </Box>
  )
}
