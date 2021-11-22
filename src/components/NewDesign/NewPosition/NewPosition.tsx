import { Grid, Typography } from '@material-ui/core'
import React, { useState, useRef } from 'react'
import PositionSettings from '../Modals/PositionSettings/PositionSettings'
import DepositSelector from './DepositSelector/DepositSelector'
import RangeSelector from './RangeSelector/RangeSelector'
import settingsIcon from '@static/svg/settings_ic.svg'
import useStyles from './style'
import { BN } from '@project-serum/anchor'
import { SwapToken } from '@selectors/solanaWallet'
import { printBN, printBNtoBN } from '@consts/utils'
import { PublicKey } from '@solana/web3.js'

export interface INewPosition {
  tokens: SwapToken[]
  data: Array<{ x: number; y: number }>
  midPriceIndex: number
  addLiquidityHandler: (
    leftTickIndex: number,
    rightTickIndex: number,
    slippageTolerance: number
  ) => void
  onChangePositionTokens: (token1Index: number | null, token2index: number | null, feeTierIndex: number) => void
  isCurrentPoolExisting: boolean
  calcAmount: (
    amount: BN,
    currentTickIndex: number,
    leftRangeTickIndex: number,
    rightRangeTickIndex: number,
    tokenAddress: PublicKey
  ) => BN
  feeTiers: number[]
  initialSlippageTolerance: number
  ticksLoading: boolean
}

export const INewPosition: React.FC<INewPosition> = ({
  tokens,
  data,
  midPriceIndex,
  addLiquidityHandler,
  onChangePositionTokens,
  isCurrentPoolExisting,
  calcAmount,
  feeTiers,
  initialSlippageTolerance,
  ticksLoading
}) => {
  const classes = useStyles()

  const settingsRef = useRef<HTMLDivElement>(null)

  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [slippageTolerance, setSlippageTolerance] = useState<number>(1)

  const [leftRange, setLeftRange] = useState(0)
  const [rightRange, setRightRange] = useState(0)

  const [token1Index, setToken1Index] = useState<number | null>(null)
  const [token2Index, setToken2Index] = useState<number | null>(null)

  const [token1Deposit, setToken1Deposit] = useState<string>('')
  const [token2Deposit, setToken2Deposit] = useState<string>('')

  const setRangeBlockerInfo = () => {
    if (token1Index === null || token2Index === null) {
      return 'Select tokens to set price range.'
    }

    if (!isCurrentPoolExisting) {
      return 'Pool is not existent.'
    }

    if (ticksLoading) {
      return 'Loading data...'
    }

    if (data.length === 0) {
      return 'Cannot get necessary data. Try later.'
    }

    return ''
  }

  const noRangePlaceholderProps = {
    data: Array(100).fill(1).map((_e, index) => ({ x: index, y: index })),
    midPriceIndex: 50,
    tokenFromSymbol: 'ABC',
    tokenToSymbol: 'XYZ'
  }

  const getOtherTokenAmount = (amount: BN, left: number, right: number, byFirst: boolean, tokenAddress: PublicKey) => {
    const printIndex = byFirst ? token1Index : token2Index
    if (printIndex === null) {
      return '0.0'
    }

    const result = calcAmount(amount, midPriceIndex, left, right, tokenAddress)

    return printBN(result, tokens[printIndex].decimal)
  }

  return (
    <Grid container className={classes.wrapper}>
      <Grid container className={classes.top} direction='row' justifyContent='space-between' alignItems='center'>
        <Typography className={classes.title}>Add new liquidity position</Typography>

        <Grid
          className={classes.settings}
          ref={settingsRef}
          onClick={() => { setSettingsOpen(true) }}
          container
          item
          alignItems='center'
        >
          <img className={classes.settingsIcon} src={settingsIcon} />
          <Typography className={classes.settingsText}>Position settings</Typography>
        </Grid>
      </Grid>

      <Grid container direction='row' justifyContent='space-between'>
        <DepositSelector
          tokens={tokens}
          setPositionTokens={(index1, index2, fee) => {
            setToken1Index(index1)
            setToken2Index(index2)
            onChangePositionTokens(index1, index2, fee)

            if (index1 !== null) {
              const amount = getOtherTokenAmount(printBNtoBN(token1Deposit, tokens[index1].decimal), leftRange, rightRange, true, tokens[index1].assetAddress)

              if (index2 !== null && +token1Deposit !== 0) {
                setToken2Deposit(amount)

                return
              }
            }

            if (index2 !== null) {
              const amount = getOtherTokenAmount(printBNtoBN(token2Deposit, tokens[index2].decimal), leftRange, rightRange, false, tokens[index2].assetAddress)

              if (index1 !== null && +token2Deposit !== 0) {
                setToken1Deposit(amount)
              }
            }
          }}
          onAddLiquidity={
            () => {
              if (token1Index !== null && token2Index !== null) {
                addLiquidityHandler(
                  leftRange,
                  rightRange,
                  slippageTolerance
                )
              }
            }
          }
          token1InputState={{
            value: token1Deposit,
            setValue: (value) => {
              if (token1Index === null) {
                return
              }
              setToken1Deposit(value)
              setToken2Deposit(getOtherTokenAmount(printBNtoBN(value, tokens[token1Index].decimal), leftRange, rightRange, true, tokens[token1Index].assetAddress))
            },
            blocked: !ticksLoading && token1Index !== null && token2Index !== null && rightRange <= midPriceIndex,
            blockerInfo: 'Range only for single-asset deposit.'
          }}
          token2InputState={{
            value: token2Deposit,
            setValue: (value) => {
              if (token2Index === null) {
                return
              }
              setToken2Deposit(value)
              setToken1Deposit(getOtherTokenAmount(printBNtoBN(value, tokens[token2Index].decimal), leftRange, rightRange, false, tokens[token2Index].assetAddress))
            },
            blocked: !ticksLoading && token1Index !== null && token2Index !== null && leftRange >= midPriceIndex,
            blockerInfo: 'Range only for single-asset deposit.'
          }}
          feeTiers={feeTiers}
          isCurrentPoolExisting={isCurrentPoolExisting}
        />

        <RangeSelector
          onChangeRange={
            (left, right) => {
              setLeftRange(left)
              setRightRange(right)

              if (token1Index !== null) {
                const amount = getOtherTokenAmount(printBNtoBN(token1Deposit, tokens[token1Index].decimal), left, right, true, tokens[token1Index].assetAddress)

                if (token2Index !== null && +token1Deposit !== 0) {
                  setToken2Deposit(amount)

                  return
                }
              }

              if (token2Index !== null) {
                const amount = getOtherTokenAmount(printBNtoBN(token2Deposit, tokens[token2Index].decimal), left, right, false, tokens[token2Index].assetAddress)

                if (token1Index !== null && +token2Deposit !== 0) {
                  setToken1Deposit(amount)
                }
              }
            }
          }
          blocked={token1Index === null || token2Index === null || !isCurrentPoolExisting || data.length === 0 || ticksLoading}
          blockerInfo={setRangeBlockerInfo()}
          {
          ...(
            token1Index === null || token2Index === null || !isCurrentPoolExisting || data.length === 0 || ticksLoading
              ? noRangePlaceholderProps
              : {
                data,
                midPriceIndex,
                tokenFromSymbol: tokens[token1Index].symbol,
                tokenToSymbol: tokens[token2Index].symbol
              }
          )
          }
        />
      </Grid>

      <PositionSettings
        open={settingsOpen}
        anchorEl={settingsRef.current}
        handleClose={() => { setSettingsOpen(false) }}
        slippageTolerance={slippageTolerance}
        onChangeSlippageTolerance={setSlippageTolerance}
        autoSetSlippageTolerance={() => { setSlippageTolerance(initialSlippageTolerance) }}
      />
    </Grid>
  )
}

export default INewPosition
