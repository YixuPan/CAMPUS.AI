import React, { useState, useEffect } from 'react';
import './shared.css';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({ isOpen, onClose }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="menu-dropdown">
      <div className="menu-items">
        <div className="menu-category">
          <div className="category-label">Academic</div>
          <a href="https://bb.imperial.ac.uk" target="_blank" rel="noopener noreferrer" className="menu-item menu-item-anim" style={{ animationDelay: '0ms' }}>
            <i className="icon-bb"></i>
            <span>Blackboard</span>
          </a>
          <a href="https://edstem.org/us/dashboard" target="_blank" rel="noopener noreferrer" className="menu-item menu-item-anim" style={{ animationDelay: '50ms' }}>
            <i className="icon-ed"></i>
            <span>Ed</span>
          </a>
        </div>
        
        <div className="menu-category">
          <div className="category-label">External Links</div>
          <a href="https://github.com/login" target="_blank" rel="noopener noreferrer" className="menu-item menu-item-anim" style={{ animationDelay: '100ms' }}>
            <i className="icon-github"></i>
            <span>GitHub</span>
          </a>
          <a href="https://www.linkedin.com/login" target="_blank" rel="noopener noreferrer" className="menu-item menu-item-anim" style={{ animationDelay: '150ms' }}>
            <i className="icon-linkedin"></i>
            <span>LinkedIn</span>
          </a>
          <a href="https://outlook.live.com/owa/" target="_blank" rel="noopener noreferrer" className="menu-item menu-item-anim" style={{ animationDelay: '200ms' }}>
            <i className="icon-mail"></i>
            <span>Email</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MenuDropdown; 