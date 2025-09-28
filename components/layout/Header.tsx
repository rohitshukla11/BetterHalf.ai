'use client'

import { useState } from 'react'
import { Menu, X, Heart, Target, Settings, Trash2 } from 'lucide-react'
import { WalletButton } from '@/components/wallet/WalletButton'

interface HeaderProps {
  // Chat interface props
  showInsights?: boolean
  onToggleInsights?: (show: boolean) => void
  onShowProfile?: () => void
  storeMemory?: boolean
  onToggleMemory?: (enabled: boolean) => void
  onClearChat?: () => void
  insights?: any
}

export function Header({
  showInsights = false,
  onToggleInsights,
  onShowProfile,
  storeMemory = true,
  onToggleMemory,
  onClearChat,
  insights
}: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-gradient-to-r from-purple-50 to-pink-50 shadow-sm border-b border-purple-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                BetterHalf.ai
              </h1>
              <p className="text-sm text-purple-700">Your AI companion for life 💜</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-6">
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                Chat
              </a>
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                Memories
              </a>
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                Profile
              </a>
            </nav>

            {/* Chat Controls */}
            {(onToggleInsights || onShowProfile || onToggleMemory || onClearChat) && (
              <div className="flex items-center space-x-3 border-r border-purple-200 pr-6">
                {onToggleInsights && (
                  <button
                    onClick={() => onToggleInsights(!showInsights)}
                    className={`p-2 rounded-lg border transition-all ${showInsights ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-purple-50'}`}
                    title="Toggle insights panel"
                  >
                    <Target className="w-4 h-4" />
                  </button>
                )}
                {onShowProfile && (
                  <button
                    onClick={onShowProfile}
                    className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-all"
                    title="Manage profile"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                {onToggleMemory && (
                  <label className="flex items-center space-x-2 text-sm bg-slate-100 px-3 py-2 rounded-lg">
                    <input
                      type="checkbox"
                      checked={storeMemory}
                      onChange={(e) => onToggleMemory(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-slate-700 font-medium">Remember</span>
                  </label>
                )}
                {onClearChat && (
                  <button
                    onClick={onClearChat}
                    className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Wallet Connection Status */}
            <WalletButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 text-purple-600 bg-white/80 backdrop-blur-sm border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-purple-200 py-4">
            <nav className="flex flex-col space-y-3 mb-4">
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                Chat
              </a>
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                Memories
              </a>
              <a href="#" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                Profile
              </a>
            </nav>

          </div>
        )}
      </div>
    </header>
  )
}