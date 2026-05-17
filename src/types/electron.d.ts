export {}

declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}
