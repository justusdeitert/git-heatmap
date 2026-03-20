export interface CliArgs {
  port: number | undefined
  open: boolean
  help: boolean
}

export function parseArgs(argv: string[]): CliArgs {
  let port: number | undefined
  let open = true
  let help = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--port' || arg === '-p') {
      const raw = argv[++i]
      const parsed = Number(raw)
      if (!raw || !Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        console.error(`Error: --port requires a valid port number (1-65535), got "${raw ?? ''}"`)
        process.exit(1)
      }
      port = parsed
    } else if (arg.startsWith('--port=')) {
      const raw = arg.slice('--port='.length)
      const parsed = Number(raw)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
        console.error(`Error: --port requires a valid port number (1-65535), got "${raw}"`)
        process.exit(1)
      }
      port = parsed
    } else if (arg === '--no-open') {
      open = false
    } else if (arg === '-h' || arg === '--help') {
      help = true
    } else {
      console.error(`Unknown option: ${arg}`)
      process.exit(1)
    }
  }

  return { port, open, help }
}
