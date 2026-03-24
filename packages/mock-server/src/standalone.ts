/**
 * @bizup-pay/mock-server — LOCAL DEVELOPMENT ONLY
 *
 * Security limitations (by design — this is a testing tool):
 * - No webhook signature validation (accepts any POST body)
 * - No HTML escaping of user-supplied fields (description, URLs)
 * - No origin validation on postMessage events
 * - Fires webhooks to any URL provided (SSRF by design for testing)
 *
 * DO NOT deploy this server in production or expose it to the internet.
 */
if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: @bizup-pay/mock-server must not be used in production.')
  process.exit(1)
}

import { MorningMockServer } from './morning-mock.js'
import { CardcomMockServer } from './cardcom-mock.js'
import { IcountMockServer } from './icount-mock.js'
import { GrowMockServer } from './grow-mock.js'
import { TranzillaMockServer } from './tranzilla-mock.js'

const morningPort = parseInt(process.env.MORNING_MOCK_PORT ?? '4100', 10)
const cardcomPort = parseInt(process.env.CARDCOM_MOCK_PORT ?? '4200', 10)
const icountPort = parseInt(process.env.ICOUNT_MOCK_PORT ?? '4300', 10)
const growPort = parseInt(process.env.GROW_MOCK_PORT ?? '4400', 10)
const tranzillaPort = parseInt(process.env.TRANZILLA_MOCK_PORT ?? '4500', 10)

const morning = new MorningMockServer({ port: morningPort, autoComplete: false })
const cardcom = new CardcomMockServer({ port: cardcomPort, autoComplete: false })
const icount = new IcountMockServer({ port: icountPort, autoComplete: false })
const grow = new GrowMockServer({ port: growPort, autoComplete: false })
const tranzilla = new TranzillaMockServer({ port: tranzillaPort, autoComplete: false })

Promise.all([morning.start(), cardcom.start(), icount.start(), grow.start(), tranzilla.start()]).then(() => {
  console.log(`Morning mock server running at ${morning.baseUrl}`)
  console.log(`  Payment page: http://localhost:${morningPort}/pay/:sessionId`)
  console.log(`Cardcom mock server running at ${cardcom.baseUrl}`)
  console.log(`  Payment page: http://localhost:${cardcomPort}/pay/:sessionId`)
  console.log(`iCount mock server running at ${icount.baseUrl}`)
  console.log(`  Payment page: http://localhost:${icountPort}/pay/:sessionId`)
  console.log(`Grow.il mock server running at ${grow.baseUrl}`)
  console.log(`  Payment page: http://localhost:${growPort}/pay/:processId`)
  console.log(`Tranzilla mock server running at ${tranzilla.baseUrl}`)
  console.log(`  Payment page: http://localhost:${tranzillaPort}/pay/:sessionId`)
  console.log()
  console.log('Press Ctrl+C to stop')
})

process.on('SIGINT', () => {
  Promise.all([morning.stop(), cardcom.stop(), icount.stop(), grow.stop(), tranzilla.stop()]).then(() => process.exit(0))
})
