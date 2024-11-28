import React, { useCallback, useState, useEffect } from "react";
import { Link } from "wouter";
import { NavigationItem } from "@/types/navigation";
import { Menu, X, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/auth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function HeaderContent() {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const { isAuthenticated, logout } = useAuth();

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
    setOpenDropdowns([]);
  }, []);

  const toggleDropdown = useCallback((itemId: string) => {
    setOpenDropdowns(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // Clean up mobile menu state when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setIsOpen(false);
      setOpenDropdowns([]);
    }
  }, [isMobile]);

  const renderNavItem = useCallback((item: NavigationItem, isMobileMenu: boolean) => {
    const isDropdownOpen = openDropdowns.includes(item.id);

    if (item.children) {
      return (
        <div key={item.id} className="relative group">
          <button
            onClick={() => toggleDropdown(item.id)}
            className="flex items-center gap-1 px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            {item.label}
            <ChevronDown 
              className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
            />
          </button>
          {isDropdownOpen && (
            <div 
              className={`${
                isMobileMenu 
                  ? 'pl-4' 
                  : 'absolute left-0 top-full min-w-[200px] bg-white shadow-lg rounded-md py-2'
              }`}
            >
              {item.children.map(child => (
                <Link
                  key={child.id}
                  href={child.href}
                  onClick={() => {
                    setIsOpen(false);
                    setOpenDropdowns([]);
                  }}
                  className="block px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.href}
        onClick={() => {
          setIsOpen(false);
          setOpenDropdowns([]);
        }}
        className="block px-4 py-2 text-gray-700 hover:text-gray-900"
      >
        {item.label}
      </Link>
    );
  }, [openDropdowns, toggleDropdown]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">DF Restauri</span>
          </Link>

          {isMobile ? (
            <button
              onClick={toggleMenu}
              className="p-2 text-gray-600 hover:text-gray-900"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          ) : (
            <nav className="flex items-center gap-8">
              {NAVIGATION_ITEMS.map(item => (
                <React.Fragment key={item.id}>
                  {renderNavItem(item, false)}
                </React.Fragment>
              ))}
              <Button>
                Richiedi Preventivo
              </Button>
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              )}
            </nav>
          )}
        </div>

        {isMobile && isOpen && (
          <div key="mobile-menu" className="absolute left-0 top-full w-full bg-white shadow-lg">
            <nav className="flex flex-col py-4">
              {NAVIGATION_ITEMS.map((item, index) => (
                <React.Fragment key={item.id || `nav-${index}`}>
                  {renderNavItem(item, true)}
                </React.Fragment>
              ))}
              <div className="px-4 mt-4">
                <Button className="w-full">
                  Richiedi Preventivo
                </Button>
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    onClick={() => logout()}
                    className="w-full mt-2"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export function Header() {
  return (
    <ErrorBoundary>
      <HeaderContent />
    </ErrorBoundary>
  );
}
