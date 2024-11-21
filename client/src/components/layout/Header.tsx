import { useCallback, useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  const toggleMenu = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const toggleDropdown = useCallback((label: string) => {
    setOpenDropdowns(prev => 
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  }, []);

  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
    setOpenDropdowns([]);
  }, [isMobile, isOpen]);

  const renderNavItem = (item: typeof NAVIGATION_ITEMS[0], mobile = false) => {
    const hasDropdown = 'items' in item;
    const isDropdownOpen = openDropdowns.includes(item.label);

    if (!hasDropdown) {
      return (
        <a
          key={item.href}
          href={item.href}
          className={`${
            mobile
              ? "block py-2 text-gray-600 hover:text-primary transition-colors"
              : "text-gray-600 hover:text-primary transition-colors"
          }`}
          onClick={() => mobile && setIsOpen(false)}
        >
          {item.label}
        </a>
      );
    }

    return (
      <div key={item.href} className={`${mobile ? "" : "relative group"}`}>
        <button
          onClick={() => mobile && toggleDropdown(item.label)}
          className={`${
            mobile
              ? "w-full text-left py-2 flex items-center justify-between"
              : "flex items-center gap-1 text-gray-600 hover:text-primary transition-colors"
          }`}
        >
          {item.label}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        <div
          className={`${
            mobile
              ? isDropdownOpen
                ? "block pl-4"
                : "hidden"
              : "absolute left-0 top-full hidden group-hover:block min-w-[200px] bg-white shadow-lg rounded-md py-2"
          }`}
        >
          {'items' in item && item.items?.map((subItem) => (
            <a
              key={subItem.href}
              href={subItem.href}
              className={`${
                mobile
                  ? "block py-2 text-gray-600 hover:text-primary transition-colors"
                  : "block px-4 py-2 text-gray-600 hover:text-primary hover:bg-gray-50 transition-colors"
              }`}
              onClick={() => mobile && setIsOpen(false)}
            >
              {subItem.label}
            </a>
          ))}
        </div>
      </div>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link href="/">
            <img 
              src="/logorestauri.png"
              alt="DF Restauri"
              className="h-12"
            />
          </Link>

          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              {isOpen ? <X /> : <Menu />}
            </Button>
          ) : (
            <nav className="flex items-center gap-8">
              {NAVIGATION_ITEMS.map((item) => renderNavItem(item))}
              <Button>
                Richiedi Preventivo
              </Button>
            </nav>
          )}
        </div>

        {isMobile && isOpen && (
          <nav className="py-4">
            {NAVIGATION_ITEMS.map((item) => renderNavItem(item, true))}
            <Button className="w-full mt-4">
              Richiedi Preventivo
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
