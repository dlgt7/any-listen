import { createExposeApp, createServerApp } from './app'
import { createExposePlayer, createServerPlayer } from './player'
import { createExposeData } from './data'
import { createExposeHotkey, createServerHotkey } from './hotkey'
import { createExposeList, createServerList } from './list'
import { createExposeMusic } from './music'
import { createExposeDislike, createServerDislike } from './dislike'
import { createExposeTheme, createServerTheme } from './theme'
import { createExposeExtension, createServerExtension } from './extension'
import { createExposeSoundEffect } from './soundEffect'
import type { ServerSocketWinMain } from '@/modules/ipc/websocket'
import { socketEvent } from '@/modules/ipc/event'
import { createMsg2call } from 'message2call'
import { appLog } from '@/shared/log4js'

export type ExposeServerFunctions = Omit<
  AnyListen.IPC.ClientIPCActions,
  'hotKeyDown' | 'showMessageBox' | 'showInputBox' | 'showOpenBox' | 'showSaveBox'
>

export type ExposeClientFunctions = Omit<
  AnyListen.IPC.ServerIPCActions<ServerSocketWinMain>,
  | 'closeWindow'
  | 'minWindow'
  | 'getHotkeyStatus'
  | 'createDesktopLyricProcess'
  | 'showOpenDialog'
  | 'showSaveDialog'
  | 'openDirInExplorer'
  | 'clipboardReadText'
  | 'clipboardWriteText'
  | 'openDevTools'
  | 'openUrl'
  | 'messageBoxConfirm'
>

let isInitialized = false
export const init = () => {
  if (isInitialized) return
  isInitialized = true

  const exposeObj: ExposeClientFunctions = {
    ...createExposeApp(),
    ...createExposePlayer(),
    ...createExposeData(),
    ...createExposeHotkey(),
    ...createExposeList(),
    ...createExposeMusic(),
    ...createExposeDislike(),
    ...createExposeTheme(),
    ...createExposeExtension(),
    ...createExposeSoundEffect(),
  }

  socketEvent.on('new_socket', (socket) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (socket.winType != 'main') return
    const msg2call = createMsg2call<AnyListen.IPC.ClientCommonActions>({
      funcsObj: exposeObj,
      timeout: 0,
      isSendErrorStack: import.meta.env.DEV,
      sendMessage(data) {
        socket.sendMessage(data)
      },
      onCallBeforeParams(rawArgs) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment
        return [socket, ...rawArgs]
      },
      onError(error, path, groupName) {
        const name = groupName ?? ''
        // const userName = socket.userInfo?.name ?? ''
        // const deviceName = socket.keyInfo?.deviceName ?? ''
        appLog.error(`call ${name} ${path.join('.')} error:`, error)
        // if (groupName == null) return
        // // TODO
        // socket.close(IPC_CLOSE_CODE.failed)
      },
    })
    socket.remote = msg2call.remote
    socket.remoteQueueTheme = msg2call.createRemoteGroup('theme', { queue: true, timeout: 0 })
    socket.remoteQueuePlayer = msg2call.createRemoteGroup('player', { queue: true, timeout: 0 })
    socket.remoteQueueList = msg2call.createRemoteGroup('list', { queue: true, timeout: 0 })
    socket.remoteQueueList = msg2call.createRemoteGroup('list', { queue: true, timeout: 0 })
    socket.remoteQueueDislike = msg2call.createRemoteGroup('dislike', { queue: true, timeout: 0 })
    socket.remoteQueueExtension = msg2call.createRemoteGroup('extension', { queue: true, timeout: 0 })
    socket.remoteExtension = msg2call.createRemoteGroup('extension', { timeout: 20_000 })
    socket.onMessage = (message) => {
      msg2call.message(message)
    }
    socket.onClose(() => {
      msg2call.destroy()
    })
  })
}

export const rendererIPC: ExposeServerFunctions = {
  ...createServerApp(),
  ...createServerPlayer(),
  ...createServerHotkey(),
  ...createServerList(),
  ...createServerDislike(),
  ...createServerTheme(),
  ...createServerExtension(),
}
