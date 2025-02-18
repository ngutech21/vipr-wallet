declare module '@j2only/slide-unlock' {
  import type { DefineComponent } from 'vue'

  interface SlideUnlockProps {
    autoWidth?: boolean
    circle?: boolean
    width?: number
    height?: number
    text?: string
    successText?: string
    name?: string
  }

  const SlideUnlock: DefineComponent<SlideUnlockProps>
  export default SlideUnlock
}
