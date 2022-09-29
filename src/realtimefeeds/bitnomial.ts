import { Filter } from '../types'
import { RealTimeFeedBase } from './realtimefeed'

export class BitnomialRealTimeFeed extends RealTimeFeedBase {
  protected wssURL = 'ws://bitnomial.com'

  // map from bitnomial subscribe 'channels' to more granular channels that tardis uses
  protected channelMappings = {
    all: ['received', 'open', 'done', 'match', 'change', 'full_snapshot'],
    book: ['snapshot', 'l2update'],
    trade: ['match', 'last_match']
  }

  protected mapToSubscribeMessages(filters: Filter<string>[]): any[] {
    let globalSymbols: string[] = []
    let channels: Map<string, string[]> = new Map()

    filters.map((filter) => {
      if (!filter.symbols || filter.symbols.length === 0) {
        throw new Error('BitnomialRealTimeFeed requires explicitly specified symbols when subscribing to live feed')
      }

      if (filter.channel === 'ticker') {
        throw new Error('BitnomialRealTimeFeed does not support ticker updates.')
      }

      const subscribeToAllChannels = filters.filter((f) => this.channelMappings.all.includes(f.channel) && f.channel !== 'match').length > 0
      const subscribeToBookChannel = this.channelMappings.book.includes(filter.channel)

      if (subscribeToAllChannels) {
        globalSymbols = globalSymbols.concat(filter.symbols)
      } else if (subscribeToBookChannel) {
        let currentBookSymbols = channels.get('book') || []
        currentBookSymbols = currentBookSymbols.concat(filter.symbols)
        channels.set('book', currentBookSymbols)
      } else {
        let currentTradeSymbols = channels.get('trade') || []
        currentTradeSymbols = currentTradeSymbols.concat(filter.symbols)
        channels.set('trade', currentTradeSymbols)
      }
    })

    const chans = [...channels].map((chanName, symbols) => {
      return {
        channel: chanName,
        product_codes: symbols
      }
    })

    return [
      {
        type: 'subscribe',
        proudct_codes: globalSymbols,
        channels: chans
      }
    ]
  }

  protected messageIsError(message: any): boolean {
    return message.type === 'disconnect'
  }
}
