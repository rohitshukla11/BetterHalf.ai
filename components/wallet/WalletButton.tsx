'use client'

import { useState, useEffect } from 'react'
import { Wallet, LogOut, Coins } from 'lucide-react'
import { useWallet } from './WalletContext'

export function WalletButton() {
  const { isConnected, address, chainId, connect, disconnect, switchNetwork, provider } = useWallet()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)
  const [balance, setBalance] = useState<string>('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await connect()
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      if (error.message.includes('MetaMask not installed')) {
        alert('Please install MetaMask to connect your wallet. Visit https://metamask.io/download/')
      } else {
        alert(`Failed to connect wallet: ${error.message}`)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 1: return 'Ethereum'
      case 16600: return '0G Chain'
      case 16602: return '0G Testnet'
      default: return `Chain ${chainId}`
    }
  }

  const handleSwitchNetwork = async (targetChainId: number) => {
    setIsSwitchingNetwork(true)
    try {
      await switchNetwork(targetChainId)
    } catch (error: any) {
      console.error('Failed to switch network:', error)
      alert(`Failed to switch network: ${error.message}`)
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  const fetchBalance = async () => {
    if (!provider || !address) return

    setIsLoadingBalance(true)
    try {
      const balance = await provider.getBalance(address)
      const balanceInEth = (Number(balance) / 1e18).toFixed(4)
      setBalance(balanceInEth)
    } catch (error) {
      console.error('Failed to fetch balance:', error)
      setBalance('0')
    } finally {
      setIsLoadingBalance(false)
    }
  }

  // Fetch balance when wallet connects or network changes
  useEffect(() => {
    if (isConnected && provider && address) {
      fetchBalance()
    } else {
      setBalance('0')
    }
  }, [isConnected, provider, address, chainId])

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
      >
        <Wallet className="h-4 w-4" />
        <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    )
  }

  // When connected, show wallet details directly in the nav bar
  return (
    <div className="flex items-center space-x-4">
      {/* Wallet Address */}
      <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg px-3 py-2 border border-purple-200">
        <Wallet className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-mono text-purple-800">{formatAddress(address!)}</span>
      </div>

      {/* Network */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-purple-600 font-medium">{getNetworkName(chainId!)}</span>
        <button
          onClick={() => handleSwitchNetwork(16600)}
          disabled={isSwitchingNetwork || chainId === 16600}
          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          0G
        </button>
      </div>

      {/* Balance */}
      <button
        onClick={fetchBalance}
        disabled={isLoadingBalance}
        className="flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-3 py-2 border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-colors disabled:opacity-50"
        title="Click to refresh balance"
      >
        <Coins className="h-4 w-4 text-green-600" />
        <span className="text-sm font-mono text-green-800">
          {isLoadingBalance ? '...' : `${balance} ETH`}
        </span>
      </button>

      {/* Disconnect Button */}
      <button
        onClick={handleDisconnect}
        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
        title="Disconnect wallet"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}
