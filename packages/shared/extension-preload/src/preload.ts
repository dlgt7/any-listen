import { createMsg2call } from 'message2call'
import { triggerTimeout } from '@/apis/global'
import { hostContext } from './host/state'
import { extensionAPIEvent } from './event'
import { onResourceAction } from './apis/resource'
import { setMessage } from './i18n'

const exposeObj = {
  updateLocale(locale) {
    hostContext.locale = locale
    extensionAPIEvent.localeChanged(locale)
  },
  updateI18nMessage(message) {
    setMessage(message)
  },
  musicListAction(action) {
    extensionAPIEvent.musicListAction(action)
  },
  playerEvent(event) {
    extensionAPIEvent.playerEvent(event)
  },
  playListAction(action) {
    extensionAPIEvent.playListAction(action)
  },
  playHistoryListAction(action) {
    extensionAPIEvent.playHistoryListAction(action)
  },
  configurationChanged(keys, config) {
    extensionAPIEvent.configurationChanged(keys, config)
  },
  async resourceAction(action) {
    return onResourceAction(
      // @ts-expect-error
      action
    )
  },
  // clientConnectAction(id, isConnected) {
  //   if (isConnected) {
  //     extensionAPIEvent.clientConnected(id)
  //   } else {
  //     extensionAPIEvent.clientDisconnected(id)
  //   }
  // },
} satisfies AnyListen.IPCExtension.ExtensionIPCActions

export const msg2call = createMsg2call<AnyListen.HostFuncs>({
  funcsObj: exposeObj,
  isSendErrorStack: true,
  timeout: 0,
  sendMessage(data?: unknown) {
    hostContext.hostCall(hostContext.key, 'message', data as string | undefined)
  },
})

export const handleHostCall: NonNullable<AnyListen.ExtensionVM.VMContext['__ext_preload__']> = (key, action, data) => {
  if (key != hostContext.key) throw new Error('preload call illegal')
  if (action == 'message') {
    msg2call.message(data)
    return
  }
  data == null
    ? // @ts-expect-error
      handleHostCallActions(action)
    : handleHostCallActions(action, JSON.parse(data) as string | number)
}

const handleHostCallActions = <T extends keyof AnyListen.ExtensionVM.PreloadCallActions>(
  action: T,
  data: AnyListen.ExtensionVM.PreloadCallActions[T]
) => {
  switch (action) {
    case 'trigger_timeout':
      triggerTimeout(data as AnyListen.ExtensionVM.PreloadCallActions['trigger_timeout'])
      break

    default:
      break
  }
}

// const extensions = new Map<string, AnyListen.Extension.Extension>()
// export const registerExtension = (extension: AnyListen.Extension.Extension) => {
//   if (extensions.has(extension.id)) throw new Error('Repeated registration expansion')
//   extensions.set(extension.id, extension)
// }
