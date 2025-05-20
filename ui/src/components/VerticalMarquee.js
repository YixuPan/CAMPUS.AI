import { jsx as _jsx } from "react/jsx-runtime";
import React, { ReactNode, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
export const VerticalMarquee = ({ children, className = '', speed = 25, pauseOnHover = true, direction = 'up', repeat = 2 }) => {
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const [contentHeight, setContentHeight] = React.useState(0);
    const [shouldAnimate, setShouldAnimate] = React.useState(true);
    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.offsetHeight);
        }
    }, [children]);
    const duration = React.useMemo(() => {
        return contentHeight / speed;
    }, [contentHeight, speed]);
    const repeatedContent = React.useMemo(() => {
        return Array(repeat)
            .fill(0)
            .map((_, i) => (_jsx("div", { className: "marquee-content", children: children }, i)));
    }, [children, repeat]);
    return (_jsx("div", { ref: containerRef, className: `vertical-marquee-container overflow-hidden relative ${className}`, onMouseEnter: () => pauseOnHover && setShouldAnimate(false), onMouseLeave: () => setShouldAnimate(true), children: _jsx(motion.div, { ref: contentRef, className: "vertical-marquee", animate: shouldAnimate ? {
                y: direction === 'up' ? [0, -contentHeight] : [-contentHeight, 0]
            } : { y: 0 }, transition: {
                duration: duration,
                ease: 'linear',
                repeat: Infinity,
                repeatType: 'loop',
                repeatDelay: 0
            }, children: repeatedContent }) }));
};
export default VerticalMarquee;
