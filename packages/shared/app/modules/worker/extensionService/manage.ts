import fs from 'node:fs'
import path from 'node:path'
import {
  backupExtension,
  buildExtensionI18nMessage,
  downloadExtension,
  loadExtension,
  mvExtension,
  parseExtension,
  removeExtensions,
  restoreExtension,
  saveExtensionsSetting,
  stopRunExtension,
  unpackExtension,
} from './shared'
import { extensionEvent } from './event'
import { extensionState } from './state'
import { checkAndCreateDir, removePath } from '@any-listen/nodejs'

/**
 * 加载已安装扩展
 */
export const loadLocalExtensions = async () => {
  extensionEvent.loadListStart()
  await checkAndCreateDir(extensionState.extensionDir)
  const [settings, extensions] = await Promise.all([
    fs.promises
      .readFile(extensionState.configFilePath)
      .then((str) => JSON.parse(str.toString('utf-8')) as AnyListen.Extension.Setting[])
      .catch((e: NodeJS.ErrnoException) => {
        if (e.code != 'ENOENT') console.warn('load extension setting failed: ', e)
        return []
      }),
    fs.promises.readdir(extensionState.extensionDir).then(async (fileNames) => {
      const tasks: Array<Promise<AnyListen.Extension.Extension | null>> = []
      for (const name of fileNames) {
        if (name.startsWith('.')) continue
        tasks.push(parseExtension(path.join(extensionState.extensionDir, name)))
      }
      return Promise.all(tasks).then((exts) => exts.filter(Boolean) as AnyListen.Extension.Extension[])
    }),
  ])
  const settingMap = new Map(settings.map((ext) => [ext.id, ext]))
  extensionState.extensions = []
  const removedExtension: AnyListen.Extension.Extension[] = []
  for (const ext of extensions) {
    const setting = settingMap.get(ext.id)
    const extension = setting
      ? {
          ...ext,
          enabled: setting.enabled,
          installedTimestamp: setting.installedTimestamp,
          removed: setting.removed,
        }
      : ext

    if (extension.removed) removedExtension.push(extension)
    else extensionState.extensions.push(extension)
  }
  extensionEvent.listSet(extensionState.extensions)

  void saveExtensionsSetting(extensionState.extensions)
  void removeExtensions(removedExtension)
  extensionEvent.loadListEnd()
}

export const startExtensions = async () => {
  extensionEvent.starting()
  for (const ext of extensionState.extensions) {
    if (ext.enabled) await loadExtension(ext)
  }
  extensionEvent.started()
}

export const startExtension = async (id: string) => {
  const targetExtension = extensionState.extensions.find((ext) => ext.id == id)
  if (!targetExtension) throw new Error(`extension not found: ${id}`)
  if (targetExtension.loaded) throw new Error(`extension is running: ${id}`)
  await loadExtension(targetExtension)
}

export const enableExtension = async (id: string) => {
  const targetExtension = extensionState.extensions.find((ext) => ext.id == id)
  if (!targetExtension) throw new Error(`extension not found: ${id}`)
  targetExtension.enabled = true
  void saveExtensionsSetting(extensionState.extensions)
  extensionEvent.enabled(id, true)
  if (targetExtension.loaded) return
  await startExtension(targetExtension.id)
}

export const disableExtension = async (id: string) => {
  const targetExtension = extensionState.extensions.find((ext) => ext.id == id)
  if (!targetExtension) throw new Error(`extension not found: ${id}`)
  targetExtension.enabled = false
  void saveExtensionsSetting(extensionState.extensions)
  extensionEvent.enabled(id, false)
  if (!targetExtension.loaded) return
  await stopRunExtension(targetExtension)
}

export const restartExtension = async (id: string) => {
  const targetExtension = extensionState.extensions.find((ext) => ext.id == id)
  if (!targetExtension) throw new Error(`extension not found: ${id}`)
  if (targetExtension.loaded) {
    extensionEvent.stoping(id)
    await stopRunExtension(targetExtension)
    extensionEvent.stoped(id)
  }
  await startExtension(id)
}

export const downloadAndParseExtension = async (url: string, manifest?: AnyListen.Extension.Manifest) => {
  const bundlePath = await downloadExtension(url, manifest)

  const extensionPath = await unpackExtension(bundlePath).catch((err: Error) => {
    void removePath(bundlePath)
    throw err
  })
  const extension = await parseExtension(extensionPath).catch((err: Error) => {
    void removePath(bundlePath)
    void removePath(extensionPath)
    throw err
  })
  if (!extension) throw new Error('Invalid Extension')
  void removePath(bundlePath)
  if (manifest && manifest.id != extension.id) {
    void removePath(extensionPath)
    throw new Error('Extension ID not Match')
  }

  return extension
}

export const updateExtension = async (tempExtension: AnyListen.Extension.Extension) => {
  const targetExtensionIndex = extensionState.extensions.findIndex((ext) => ext.id == tempExtension.id)
  if (targetExtensionIndex < 0) {
    void removePath(tempExtension.directory)
    throw new Error(`Will update extension does not exist: ${tempExtension.id}`)
  }

  const targetExtension = extensionState.extensions[targetExtensionIndex]
  if (targetExtension.loaded) throw new Error(`Will update extension does running: ${tempExtension.id}`)
  if (targetExtension.publicKey != tempExtension.publicKey) throw new Error('Signature does not match')

  const backupPath = await backupExtension(targetExtension.dataDirectory)
  try {
    const extensionPath = await mvExtension(tempExtension.directory)
    const extension = await parseExtension(extensionPath)
    if (!extension) {
      void removePath(extensionPath)
      console.error('Extension perse failed: ', extensionPath)
      throw new Error('Extension perse failed')
    }
    extension.updatedTimestamp = Date.now()
    extensionState.extensions.splice(targetExtensionIndex, 1, extension)
    extensionEvent.listUpdate(extension)
    await saveExtensionsSetting(extensionState.extensions)
    return extension
  } catch (err) {
    await restoreExtension(backupPath)
    throw err as Error
  }
}

export const installExtension = async (tempExtension: AnyListen.Extension.Extension) => {
  if (extensionState.extensions.some((ext) => ext.id == tempExtension.id)) {
    void removePath(tempExtension.directory)
    throw new Error(`Repeated expansion: ${tempExtension.id}`)
  }

  const extensionPath = await mvExtension(tempExtension.directory)
  const extension = await parseExtension(extensionPath)
  if (!extension) {
    void removePath(extensionPath)
    console.error('Extension perse failed: ', extensionPath)
    throw new Error('Extension perse failed')
  }

  extension.updatedTimestamp = extension.installedTimestamp = Date.now()
  extensionState.extensions.unshift(extension)
  extensionEvent.listAdd(extension)

  await saveExtensionsSetting(extensionState.extensions)

  return extension
}

export const uninstallExtension = async (id: string) => {
  const targetExtensionIndex = extensionState.extensions.findIndex((ext) => ext.id == id)
  if (targetExtensionIndex < 0) throw new Error(`extension not found: ${id}`)
  const targetExtension = extensionState.extensions[targetExtensionIndex]
  targetExtension.requiredReload = await stopRunExtension(targetExtension)
  if (!targetExtension.requiredReload) {
    await removeExtensions([targetExtension])
    extensionState.extensions.splice(targetExtensionIndex, 1)
    await saveExtensionsSetting(extensionState.extensions)
    extensionEvent.listRemove(id)
  }
}

export const updateExtensionI18nMessages = async () => {
  for (const ext of extensionState.extensions) {
    ext.i18nMessages = await buildExtensionI18nMessage(ext.directory)
  }
  extensionEvent.listSet(extensionState.extensions)
}
