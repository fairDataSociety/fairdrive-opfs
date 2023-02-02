// Example usage of fdp fs browser API polyfill
import React from 'react'
import { FullFileBrowser } from 'chonky'
import { showOpenFilePicker } from 'native-file-system-adapter'
import { useEffect } from 'react'
import { ChonkyActions } from 'chonky'
import { useCallback } from 'react'
import Modal from 'react-modal'
import { fileSave } from 'browser-fs-access'
import { FdpConnectModule, FairosProvider } from '@fairdatasociety/fairdrive-opfs'

const module = new FdpConnectModule({
  providers: {
    fairos: {
      options: {
        host: 'https://fairos.fairdatasociety.org/',
      },
      provider: '@fairdatasociety/fairdrive-opfs/providers/fairos',
    },
  },
})

Modal.setAppElement('#root')

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
}

export const FairdriveBrowser = ({ id, name }) => {
  const [currentPath, setCurrentPath] = React.useState('/')
  const [items, setItems] = React.useState([])
  const [pods, setPods] = React.useState([])
  const [folderName, setFolderName] = React.useState('')
  const [loadingMessage, setLoadingMessage] = React.useState('Loading pod...')
  const [loading, setLoading] = React.useState(false)
  const [podItem, setPod] = React.useState({ name: '' })
  const [folderChain, setFolderChain] = React.useState([])
  const myFileActions = [
    ChonkyActions.UploadFiles,
    ChonkyActions.CreateFolder,
    ChonkyActions.DeleteFiles,
    ChonkyActions.DownloadFiles,
  ]
  const [modalIsOpen, setIsOpen] = React.useState(false)
  const [selectedFileHandle, setSelectedFileHandle] = React.useState(null)
  const [connector, setConnector] = React.useState(null)
  const [currentFolderHandle, setCurrentFolderHandle] = React.useState(null)

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
      const fairosConnector = await module.connect('fairos', FairosProvider)
      await fairosConnector.userLogin(process.env.REACT_APP_USERNAME, process.env.REACT_APP_PASSWORD)

      setConnector(fairosConnector)
      try {
        const podList = await fairosConnector.listMounts()
        setPods(podList)
      } catch (e) {
        // eslint-disable-next-line
        console.log(e)
      }
      setLoading(false)
    }

    getPods()
  }, [])

  async function handlePodChange(e) {
    setLoadingMessage(`Loading pod ${e.target.value}...`)
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
  }

  async function createFolder() {
    setLoadingMessage(`Creating folder ${currentPath}${folderName}...`)
    setLoading(true)

    setCurrentPath(`${currentPath}${folderName}/`)
    setLoadingMessage('')
    setLoading(false)
  }

  const handleAction = podItem =>
    useCallback(
      data => {
        async function upload() {
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

        async function deleteFile() {
          setLoading(true)
          setLoadingMessage('Removing file...')

          const file = selectedFileHandle.selectedFilesForAction[0].handle

          await currentFolderHandle.removeEntry(file.name)

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

        setSelectedFileHandle(data.state)
        if (data.id === ChonkyActions.UploadFiles.id) {
          upload()
        } else if (data.id === ChonkyActions.DownloadFiles.id) {
          const h = selectedFileHandle.selectedFilesForAction[0].handle
          const blob = h.getFile()
          // Save a file.
          fileSave(blob, {
            fileName: h.name,
            // extensions: ['.png'],
          })
        } else if (data.id === ChonkyActions.DeleteFiles.id) {
          deleteFile()
        } else if (data.id === ChonkyActions.CreateFolder.id) {
          openModal()
        }
      },
      [podItem, loading, selectedFileHandle],
    )

  return (
    <div className="md:container md:mx-auto">
      <div>
        <label for="pods" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Pods
        </label>
        <select
          onChange={handlePodChange}
          id="pods"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        >
          <option defaultValue={''}>Select a pod</option>
          {pods.map(pod => (
            <option value={pod.name} key={pod.name}>
              {pod.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        {loading ? (
          <div role="status">
            <svg
              aria-hidden="true"
              className="mr-2 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
        ) : null}
        <FullFileBrowser
          onFileAction={handleAction(podItem)}
          files={items}
          folderChain={folderChain}
          fileActions={myFileActions}
        />
        <Modal
          isOpen={modalIsOpen}
          onAfterOpen={afterOpenModal}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="File actions"
        >
          <form style={{ display: 'flex', flexDirection: 'column' }}>
            <label>New folder name:</label>
            <input id="directory" onChange={setFolderName} />
            <button onClick={createFolder} style={{ marginTop: 10 }}>
              Submit
            </button>
          </form>
        </Modal>
      </div>
    </div>
  )
}
