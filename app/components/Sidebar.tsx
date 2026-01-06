'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  RefreshCw, 
  FileEdit, 
  Search, 
  Menu, 
  Github,
  ExternalLink,
  MessageCircle,
  X
} from 'lucide-react';

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Detect mobile and persist sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // On mobile, always start collapsed
      if (mobile) {
        setIsExpanded(false);
      } else {
        // On desktop, use saved preference or default to expanded
        const saved = localStorage.getItem('sidebarExpanded');
        if (saved !== null) {
          setIsExpanded(saved === 'true');
        } else {
          setIsExpanded(true); // Default to expanded on desktop
        }
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (!isMobile) {
      localStorage.setItem('sidebarExpanded', String(newState));
    }
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsExpanded(false);
    }
  };

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/config-converter', icon: RefreshCw, label: 'Config Converter' },
    { href: '/config-editor', icon: FileEdit, label: 'Config Editor' },
    { href: '/config-browser', icon: Search, label: 'Config Browser' },
  ];

  const externalLinks = [
    { 
      href: 'https://github.com/andreisugu/gamenative-config-tools', 
      icon: Github, 
      label: 'GitHub' 
    },
    { 
      href: 'https://gamenative.app/', 
      icon: ExternalLink, 
      label: 'GameNative' 
    },
    { 
      href: 'https://discord.gg/2hKv4VfZfE', 
      icon: MessageCircle, 
      label: 'Discord' 
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isExpanded && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 transition-all duration-300 ease-in-out z-50 overflow-hidden ${
          isMobile 
            ? (isExpanded ? 'w-64' : 'w-0 -translate-x-full') 
            : (isExpanded ? 'w-64' : 'w-16')
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Toggle Button */}
          <div className="p-4 border-b border-gray-800">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-cyan-400"
              aria-label="Toggle sidebar"
            >
              {isExpanded && isMobile ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeSidebar}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-cyan-400'
                      }`}
                      title={!isExpanded ? item.label : undefined}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {isExpanded && (
                        <span className="text-sm font-medium whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* External Links */}
          <div className="border-t border-gray-800 py-4">
            <ul className="space-y-1 px-2">
              {externalLinks.map((link) => {
                const Icon = link.icon;
                
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-cyan-400 transition-all"
                      title={!isExpanded ? link.label : undefined}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {isExpanded && (
                        <span className="text-sm font-medium whitespace-nowrap">
                          {link.label}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>

      {/* Mobile menu button - shown when sidebar is hidden */}
      {isMobile && !isExpanded && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-40 p-3 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition-all"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Spacer to prevent content from going under sidebar - only on desktop */}
      {/* This is necessary because the sidebar is fixed positioned and would otherwise overlap content */}
      {!isMobile && <div className={`transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-16'}`} />}
    </>
  );
}
