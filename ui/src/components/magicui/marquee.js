import { jsx as _jsx } from "react/jsx-runtime";
import "./marquee.css";
export function Marquee({ className, reverse = false, pauseOnHover = false, children, vertical = false, style, ...props }) {
    // Create duplicate content for continuous scrolling
    const content = [children, children];
    // Create class name for content
    const contentClassName = `
    ${vertical ? 'marquee-content--vertical' : 'marquee-content--horizontal'}
    ${reverse ? 'marquee-content--reverse' : ''}
    ${pauseOnHover ? 'marquee-content--pausable' : ''}
  `.trim();
    // Merge styles with defaults
    const mergedStyles = {
        "--duration": "40s",
        "--gap": "1rem",
        ...style
    };
    return (_jsx("div", { ...props, className: `marquee-container ${className || ''}`, style: mergedStyles, children: content.map((item, i) => (_jsx("div", { className: contentClassName, children: item }, i))) }));
}
