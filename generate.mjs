#!/bin/sh
":" //# http://sambal.org/?p=1014 ; exec /usr/bin/env node --experimental-modules "$0" "$@"

import fs from 'fs'
import path from 'path'
import { EOL } from 'os'
import pkg from './package.json'
import * as pine from './pine.mjs'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

const tickers = fs.readFileSync(`${__dirname}/tickers`, 'utf8')
  .split(EOL)
  .filter(v => v.length)
	.map(v => v.replace(/\s+/g, ':'))

const tickersInfo = tickers
	.map(ticker => {
		const [ exchange, pair ] = ticker.split(':')
		return { ticker, exchange, pair }
	})

const script = `
//@version=3
study("Crypto Market Breadth [m59]", shorttitle="Crypto Market Breadth", precision=0)

${pine.comment(
`
This script was generated from ${pkg.repository.url}

Issues? ${pkg.bugs}


----- DESCRIPTION

The percent of top market cap crypto-currencies advancing and the percent declining.
Whether the asset is advancing or declining is determined by whether it closes above or below its moving average.

Credit to @bigurb for suggesting and helping with this indicator.


----- PRINTED VALUES

Advancing Pairs (1) | Declining Pairs (1) |
Advancing Pairs (2) | Declining Pairs (2) |
Percent of Pairs Used

* Percent of Pairs Used
Pairs have different lengths of history. Most pairs used have market data before 2018.
Where a pair lacks history, the "Pairs Used" value diminishes.
Where more than half of the desired pairs are lacking data,
the indicator background will be shaded gray.


----- OPTIONS

Number of Top Market Cap Currencies: The amount of currencies to use i.e. "30" will use the top 30 highest market cap currencies. By default, all 40 available currencies are used.
Moving Average Length (1)
Moving Average Length (2)


----- TICKERS

${tickers.join(EOL)}
`
)}


//----- INPUTS

numberOfTopMarketCapCurrencies = input(40, minval=1, maxval=40, title="Number of Top Market Cap Currencies")


//----- HELPERS

tickerValue (expression, tkr) => security(tkr, period, expression)

add (a, b) => a + b


//----- VALUES

${tickersInfo
	.map(({ ticker, exchange, pair }) => `${pair}_close = tickerValue(close, "${ticker}")`)
	.join(EOL)
}

${[
  { defaultMaLength: 20, transp: 65 },
  { defaultMaLength: 50, transp: 25 }
]
	.map(({ defaultMaLength, transp }, i) => {
		i = i + 1
		return `
movingAverageLength${i} = input(${defaultMaLength}, title="Moving Average Length ${i}")

${tickersInfo
	.map(({ pair }, j) => `${pair}_movingAverage${i} = numberOfTopMarketCapCurrencies < ${j + 1}
	 ? na
	 : sma(${pair}_close, movingAverageLength${i})`)
	.join(EOL)
}

pairsUsed${i} = ${tickersInfo
  .map(({ pair }) => `(na(${pair}_movingAverage${i}) ? 0 : 1)`)
	.join(' + ')
}

advancing${i} = ${tickersInfo
	.map(({ pair }) =>
	  `(not na(${pair}_movingAverage${i}) and ${pair}_close > ${pair}_movingAverage${i} ? 1 : 0)`
	)
	.join(' + ')
}

advancingRatio${i} = advancing${i} / pairsUsed${i}
advancingPercent${i} = advancingRatio${i} * 100
decliningPercent${i} = 100 - advancingPercent${i}
pairsUsedPercent${i} = (pairsUsed${i} / numberOfTopMarketCapCurrencies) * 100


//----- RENDER

plot(advancingPercent${i}, title="Advancing Percent ${i}", linewidth=${i}, color=#23A06C, transp=${transp})
plot(decliningPercent${i}, title="Declining Percent ${i}", linewidth=${i}, color=#FF2E00, transp=${transp})
	`})
	.join(EOL)
}

leastPairsUsedPercent = min(pairsUsedPercent1, pairsUsedPercent2)
tooMuchDataIsMissing = leastPairsUsedPercent < 50

plot(leastPairsUsedPercent, title="Percent Pairs Used", linewidth=1, color=gray, transp=100)

hline(0, linestyle=dotted, color=red)
hline(50, linestyle=dotted, color=gray)
hline(100, linestyle=dotted, color=green)
bgcolor(tooMuchDataIsMissing ? gray : na)
`

process.stdout.write(script)
