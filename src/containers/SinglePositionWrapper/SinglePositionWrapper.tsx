import React, { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { actions } from '@reducers/positions'
import { isLoadingPositionsList, plotTicks, singlePositionData } from '@selectors/positions'
import PositionDetails from '@components/PositionDetails/PositionDetails'
import { Typography } from '@material-ui/core'
import { printBN } from '@consts/utils'
import { PRICE_DECIMAL } from '@consts/static'
import { calculate_price_sqrt } from '@invariant-labs/sdk'

export interface IProps {
  id: string
}

export const SinglePositionWrapper: React.FC<IProps> = ({ id }) => {
  const dispatch = useDispatch()

  const position = useSelector(singlePositionData(id))
  const isLoadingList = useSelector(isLoadingPositionsList)
  const { data: ticksData, loading: ticksLoading } = useSelector(plotTicks)

  const midPriceIndex = useMemo(() => ticksData.findIndex((tick) => tick.index === position?.poolData.currentTickIndex), [ticksData.length, position?.id])
  const leftRangeIndex = useMemo(() => ticksData.findIndex((tick) => tick.index === position?.lowerTickIndex), [ticksData.length, position?.id])
  const rightRangeIndex = useMemo(() => ticksData.findIndex((tick) => tick.index === position?.upperTickIndex), [ticksData.length, position?.id])

  const min = useMemo(() => {
    if (position) {
      const sqrtDec = calculate_price_sqrt(position.lowerTickIndex)
      const sqrt = +printBN(sqrtDec.v, PRICE_DECIMAL)

      return sqrt ** 2
    }

    return 0
  }, [position?.lowerTickIndex])
  const max = useMemo(() => {
    if (position) {
      const sqrtDec = calculate_price_sqrt(position.upperTickIndex)
      const sqrt = +printBN(sqrtDec.v, PRICE_DECIMAL)

      return sqrt ** 2
    }

    return 0
  }, [position?.upperTickIndex])

  const maxDecimals = (value: number): number => {
    if (value >= 10000) {
      return 0
    }

    if (value >= 1000) {
      return 1
    }

    if (value >= 100) {
      return 2
    }

    return 4
  }

  return (
    !isLoadingList && !ticksLoading && position
      ? (
        <PositionDetails
          detailsData={ticksData}
          midPriceIndex={midPriceIndex}
          leftRangeIndex={leftRangeIndex}
          rightRangeIndex={rightRangeIndex}
          currentPrice={0}
          tokenY={position.tokenX.symbol}
          tokenX={position.tokenY.symbol}
          onZoomOutOfData={(min, max) => {
            if (position) {
              dispatch(actions.getCurrentPlotTicks({
                poolIndex: position.poolData.poolIndex,
                isXtoY: true,
                min,
                max
              }))
            }
          }}
          onClickClaimFee={() => {
            dispatch(actions.claimFee(id))
          }}
          closePosition={() => {
            dispatch(actions.closePosition(id))
          }}
          tokenXLiqValue={+printBN(position.tokensOwedX.v, position.tokenX.decimal)}
          tokenYLiqValue={+printBN(position.tokensOwedY.v, position.tokenY.decimal)}
          tokenXClaimValue={+printBN(position.feeGrowthInsideX.v, position.tokenX.decimal)}
          tokenYClaimValue={+printBN(position.feeGrowthInsideY.v, position.tokenY.decimal)}
          positionData={{
            tokenXName: position.tokenX.symbol,
            tokenYName: position.tokenY.symbol,
            tokenXIcon: position.tokenX.logoURI,
            tokenYIcon: position.tokenY.logoURI,
            fee: +printBN(position.poolData.fee.v, PRICE_DECIMAL - 2),
            min: +(min.toFixed(maxDecimals(min))),
            max: +(max.toFixed(maxDecimals(max)))
          }}
        />
      )
      : (
        isLoadingList || ticksLoading
          ? <Typography>Loading...</Typography>
          : <Typography>Position does not exist in your list.</Typography>
      )
  )
}
