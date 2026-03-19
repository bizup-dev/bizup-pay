import { MorningMockServer } from './morning-mock.js'

const port = parseInt(process.env.MORNING_MOCK_PORT ?? '4100', 10)
const morning = new MorningMockServer({ port, autoComplete: false })

morning.start().then(() => {
  console.log(`Morning mock server running at ${morning.baseUrl}`)
  console.log(`Payment page: http://localhost:${port}/pay/:sessionId`)
  console.log()
  console.log('Press Ctrl+C to stop')
})

process.on('SIGINT', () => {
  morning.stop().then(() => process.exit(0))
})
