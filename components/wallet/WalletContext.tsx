'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ethers } from 'ethers'

export interface WalletState {
  isConnected: boolean
  address: string | null
  chainId: number | null
  provider: ethers.BrowserProvider | null
  signer: ethers.Signer | null
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: (chainId: number) => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    provider: null,
    signer: null,
  })

  const connect = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to connect your wallet.')
      }

      // Check if MetaMask is available
      if (!window.ethereum.isMetaMask) {
        throw new Error('MetaMask not detected. Please make sure MetaMask is installed and active.')
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      const network = await provider.getNetwork()
      const chainId = Number(network.chainId)

      setWalletState({
        isConnected: true,
        address,
        chainId,
        provider,
        signer,
      })

      console.log('✅ Wallet connected:', { address, chainId })

      // Set up event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error)
      throw error
    }
  }

  const disconnect = () => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      provider: null,
      signer: null,
    })

    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }

    console.log('🔌 Wallet disconnected')
  }

  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })

      // Update chain ID
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      const newChainId = Number(network.chainId)

      setWalletState(prev => ({
        ...prev,
        chainId: newChainId,
        provider,
      }))

    } catch (error: any) {
      console.error('❌ Network switch failed:', error)
      throw error
    }
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect()
    } else if (accounts[0] !== walletState.address) {
      // Account changed
      setWalletState(prev => ({
        ...prev,
        address: accounts[0],
      }))
    }
  }

  const handleChainChanged = (chainId: string) => {
    const newChainId = parseInt(chainId, 16)
    setWalletState(prev => ({
      ...prev,
      chainId: newChainId,
    }))
    window.location.reload() // Reload to ensure proper chain context
  }

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) {
            await connect()
          }
        } catch (error) {
          console.warn('Failed to check existing connection:', error)
        }
      }
    }

    checkConnection()

    // Cleanup event listeners on unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  const value: WalletContextType = {
    ...walletState,
    connect,
    disconnect,
    switchNetwork,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}
