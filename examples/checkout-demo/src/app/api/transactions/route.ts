import { NextResponse } from 'next/server'
import { getAllPurchases } from '../../../lib/store'

export async function GET() {
  return NextResponse.json({ purchases: getAllPurchases() })
}
