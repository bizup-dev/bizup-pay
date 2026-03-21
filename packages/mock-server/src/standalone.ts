import { MorningMockServer } from './morning-mock.js'
import { CardcomMockServer } from './cardcom-mock.js'
import { IcountMockServer } from './icount-mock.js'
import { GrowMockServer } from './grow-mock.js'

const morningPort = parseInt(process.env.MORNING_MOCK_PORT ?? '4100', 10)
const cardcomPort = parseInt(process.env.CARDCOM_MOCK_PORT ?? '4200', 10)
const icountPort = parseInt(process.env.ICOUNT_MOCK_PORT ?? '4300', 10)
const growPort = parseInt(process.env.GROW_MOCK_PORT ?? '4400', 10)

const morning = new MorningMockServer({ port: morningPort, autoComplete: false })
const cardcom = new CardcomMockServer({ port: cardcomPort, autoComplete: false })
const icount = new IcountMockServer({ port: icountPort, autoComplete: false })
const grow = new GrowMockServer({ port: growPort, autoComplete: false })

Promise.all([morning.start(), cardcom.start(), icount.start(), grow.start()]).then(() => {
  console.log(`Morning mock server running at ${morning.baseUrl}`)
  console.log(`  Payment page: http://localhost:${morningPort}/pay/:sessionId`)
  console.log(`Cardcom mock server running at ${cardcom.baseUrl}`)
  console.log(`  Payment page: http://localhost:${cardcomPort}/pay/:sessionId`)
  console.log(`iCount mock server running at ${icount.baseUrl}`)
  console.log(`  Payment page: http://localhost:${icountPort}/pay/:sessionId`)
  console.log(`Grow.il mock server running at ${grow.baseUrl}`)
  console.log(`  Payment page: http://localhost:${growPort}/pay/:processId`)
  console.log()
  console.log('Press Ctrl+C to stop')
})

process.on('SIGINT', () => {
  Promise.all([morning.stop(), cardcom.stop(), icount.stop(), grow.stop()]).then(() => process.exit(0))
})
