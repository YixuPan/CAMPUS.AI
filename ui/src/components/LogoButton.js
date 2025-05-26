import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import MenuDropdown from './MenuDropdown';
import './shared.css';
const LogoButton = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const target = event.target;
            if (!target.closest('.logo-circle') && !target.closest('.menu-dropdown')) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    // Toggle menu
    const toggleMenu = (e) => {
        e.preventDefault();
        setIsMenuOpen(!isMenuOpen);
    };
    return (_jsxs("div", { className: "logo", children: [_jsx("div", { className: `logo-circle ${isMenuOpen ? 'open' : ''}`, onClick: toggleMenu, children: _jsx("span", { className: "logo-icon" }) }), _jsx(MenuDropdown, { isOpen: isMenuOpen, onClose: () => setIsMenuOpen(false) })] }));
};
export default LogoButton;
