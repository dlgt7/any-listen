import { debounce } from '@any-listen/common/utils'
import type { Action } from 'svelte/action'

export const scrollPointerEvents: Action<HTMLElement> = (dom: HTMLElement) => {
  let isListScrolling = false
  const setStopScrollStatus = debounce(() => {
    isListScrolling = false
    dom.style.pointerEvents = 'auto'
  }, 200)
  const onScroll = () => {
    if (!isListScrolling) {
      isListScrolling = true
      dom.style.pointerEvents = 'none'
    }
    setStopScrollStatus()
  }

  dom.addEventListener('scroll', onScroll)

  return {
    destroy() {
      dom.removeEventListener('scroll', onScroll)
    },
  }
}
