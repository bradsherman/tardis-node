import { parseμs, upperCaseSymbols } from '../handy'
import { BookChange, Trade } from '../types'
import { Mapper } from './mapper'

export const bitnomialTradesMapper: Mapper<'bitnomial', Trade> = {
  canHandle(message: BitnomialTrade) {
    return message.type === 'trade'
  },

  getFilters(symbols?: string[]) {
    symbols = upperCaseSymbols(symbols)

    return [
      {
        channel: 'trade',
        symbols
      }
    ]
  },

  *map(message: BitnomialTrade, localTimestamp: Date): IterableIterator<Trade> {
    const { ack_id, price, quantity, taker_side, symbol, timestamp } = message

    // TODO: we send ISO datetime strings - do we want to send micros since epoch instead?
    const timeExchange = Number(timestamp)
    const tradeTime = new Date(timeExchange * 1000)
    tradeTime.μs = Math.floor(timeExchange * 1000000) % 1000

    yield {
      type: 'trade',
      symbol,
      exchange: 'bitnomial',
      id: ack_id,
      price: Number(price),
      amount: Number(quantity),
      side: taker_side === 'Bid' ? 'buy' : 'sell',
      timestamp: tradeTime,
      localTimestamp
    }
  }
}

const mapBitnomialBookLevel = (level: BitnomialBookLevel) => {
  const [price, amount] = level

  return { price: Number(price), amount: Number(amount) }
}

export const bitnomialBookChangeMapper: Mapper<'bitnomial', BookChange> = {
  canHandle(message: BitnomialBookSnapshot | BitnomialLevelUpdate) {
    return message.type === 'book' || message.type === 'level'
  },

  getFilters(symbols?: string[]) {
    symbols = upperCaseSymbols(symbols)

    return [
      {
        channel: 'book',
        symbols
      }
    ]
  },

  *map(message: BitnomialBookSnapshot | BitnomialLevelUpdate, localTimestamp: Date): IterableIterator<BookChange> {
    if (message.type === 'book') {
      const timestamp = new Date(message.timestamp)
      timestamp.μs = parseμs(message.timestamp)
      yield {
        type: 'book_change',
        symbol: message.symbol,
        exchange: 'bitnomial',
        isSnapshot: true,
        bids: message.bids.map(mapBitnomialBookLevel),
        asks: message.asks.map(mapBitnomialBookLevel),
        timestamp,
        localTimestamp
      }
    } else {
      const timestamp = new Date(message.timestamp)
      timestamp.μs = parseμs(message.timestamp)

      yield {
        type: 'book_change',
        symbol: message.symbol,
        exchange: 'bitnomial',
        isSnapshot: false,
        bids: message.side === 'Bid' ? [{ price: message.price, amount: message.quantity }] : [],
        asks: message.side === 'Ask' ? [{ price: message.price, amount: message.quantity }] : [],
        timestamp,
        localTimestamp
      }
    }
  }
}

type BitnomialTrade = {
  type: 'trade'
  ack_id: string
  price: number
  quantity: number
  symbol: string
  taker_side: 'Bid' | 'Ask'
  timestamp: string
}
type BitnomialBookLevel = [string, string]
type BitnomialLevelUpdate = {
  type: 'level'
  ack_id: string
  price: number
  quantity: number
  side: 'Bid' | 'Ask'
  symbol: string
  timestamp: string
}
type BitnomialBookSnapshot = {
  type: 'book'
  ack_id: string
  asks: BitnomialBookLevel[]
  bids: BitnomialBookLevel[]
  symbol: string
  timestamp: string
}
