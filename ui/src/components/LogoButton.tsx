import React, { useState, useEffect } from 'react';
import MenuDropdown from './MenuDropdown';
import './shared.css';

interface LogoButtonProps {
  // No props needed for now
}

const LogoButton: React.FC<LogoButtonProps> = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.logo-circle') && !target.closest('.menu-dropdown')) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Toggle menu
  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <div className="logo">
      <div className={`logo-circle ${isMenuOpen ? 'open' : ''}`} onClick={toggleMenu}>
        <span className="logo-icon"></span>
      </div>
      <MenuDropdown 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />
    </div>
  );
};

export default LogoButton; 