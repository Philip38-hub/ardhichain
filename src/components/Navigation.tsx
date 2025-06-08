import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Search, Shield } from 'lucide-react';
import { WalletConnector } from './WalletConnector';
import { useApp } from '../context/AppContext';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { isAdmin } = useApp();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/my-titles', icon: FileText, label: 'My Titles' },
    { path: '/verify', icon: Search, label: 'Verify' },
  ];

  if (isAdmin) {
    navItems.splice(1, 0, { path: '/admin', icon: Shield, label: 'Admin' });
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ArdhiChain</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {navItems.map(({ path, icon: Icon, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <WalletConnector />
        </div>
      </div>
    </nav>
  );
};