import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import './shared.css';
const MenuDropdown = ({ isOpen, onClose }) => {
    // Close on ESC key
    useEffect(() => {
        const handleEscKey = (e) => {
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
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "menu-dropdown", children: _jsxs("div", { className: "menu-items", children: [_jsxs("div", { className: "menu-category", children: [_jsx("div", { className: "category-label", children: "Academic" }), _jsxs("a", { href: "https://bb.imperial.ac.uk", target: "_blank", rel: "noopener noreferrer", className: "menu-item menu-item-anim", style: { animationDelay: '0ms' }, children: [_jsx("i", { className: "icon-bb" }), _jsx("span", { children: "Blackboard" })] }), _jsxs("a", { href: "https://edstem.org/us/dashboard", target: "_blank", rel: "noopener noreferrer", className: "menu-item menu-item-anim", style: { animationDelay: '50ms' }, children: [_jsx("i", { className: "icon-ed" }), _jsx("span", { children: "Ed" })] })] }), _jsxs("div", { className: "menu-category", children: [_jsx("div", { className: "category-label", children: "External Links" }), _jsxs("a", { href: "https://github.com/login", target: "_blank", rel: "noopener noreferrer", className: "menu-item menu-item-anim", style: { animationDelay: '100ms' }, children: [_jsx("i", { className: "icon-github" }), _jsx("span", { children: "GitHub" })] }), _jsxs("a", { href: "https://www.linkedin.com/login", target: "_blank", rel: "noopener noreferrer", className: "menu-item menu-item-anim", style: { animationDelay: '150ms' }, children: [_jsx("i", { className: "icon-linkedin" }), _jsx("span", { children: "LinkedIn" })] }), _jsxs("a", { href: "https://outlook.live.com/owa/", target: "_blank", rel: "noopener noreferrer", className: "menu-item menu-item-anim", style: { animationDelay: '200ms' }, children: [_jsx("i", { className: "icon-mail" }), _jsx("span", { children: "Email" })] })] })] }) }));
};
export default MenuDropdown;
