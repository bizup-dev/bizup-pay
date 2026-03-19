import { MorningMockServer } from './morning-mock.js'
import { CardcomMockServer } from './cardcom-mock.js'

const morningPort = parseInt(process.env.MORNING_MOCK_PORT ?? '4100', 10)
const cardcomPort = parseInt(process.env.CARDCOM_MOCK_PORT ?? '4200', 10)

const morning = new MorningMockServer({ port: morningPort, autoComplete: false })
const cardcom = new CardcomMockServer({ port: cardcomPort, autoComplete: false })

Promise.all([morning.start(), cardcom.start()]).then(() => {
  console.log(`Morning mock server running at ${morning.baseUrl}`)
  console.log(`  Payment page: http://localhost:${morningPort}/pay/:sessionId`)
  console.log(`Cardcom mock server running at ${cardcom.baseUrl}`)
  console.log(`  Payment page: http://localhost:${cardcomPort}/pay/:sessionId`)
  console.log()
  console.log('Press Ctrl+C to stop')
})

process.on('SIGINT', () => {
  Promise.all([morning.stop(), cardcom.stop()]).then(() => process.exit(0))
})
