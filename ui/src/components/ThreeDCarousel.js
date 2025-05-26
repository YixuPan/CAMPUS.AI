import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { memo, useEffect, useRef, useState, useMemo } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
// Hook to check screen size
const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const updateMatches = () => setMatches(mediaQuery.matches);
        updateMatches();
        mediaQuery.addEventListener("change", updateMatches);
        return () => {
            mediaQuery.removeEventListener("change", updateMatches);
        };
    }, [query]);
    return matches;
};
// Core carousel component
const DaysCarousel = memo(({ days, selectedDate, onDaySelect, }) => {
    const isSmallScreen = useMediaQuery("(max-width: 640px)");
    const cylinderWidth = isSmallScreen ? 900 : 1400;
    const faceCount = days.length;
    const radius = cylinderWidth / (2 * Math.PI);
    // Refs to track values between renders
    const rotationRef = useRef(0);
    const velocityRef = useRef(0);
    const isDraggingRef = useRef(false);
    const startTimeRef = useRef(0);
    const startXRef = useRef(0);
    // Use motion value with spring for smooth animation
    const rotation = useMotionValue(0);
    const springRotation = useSpring(rotation, {
        stiffness: 80,
        damping: 20,
        mass: 0.5
    });
    // Transform rotation to CSS transform
    const cylinderTransform = useTransform(springRotation, (value) => `rotateY(${value}deg)`);
    // Track dragging state for UI updates
    const [isDragging, setIsDragging] = useState(false);
    // Auto-rotation effect
    useEffect(() => {
        // Only auto-rotate if we're not dragging
        if (isDraggingRef.current)
            return;
        const autoRotate = () => {
            if (!isDraggingRef.current && Math.abs(velocityRef.current) < 0.01) {
                rotationRef.current += 0.1;
                rotation.set(rotationRef.current);
            }
        };
        const interval = setInterval(autoRotate, 50);
        return () => clearInterval(interval);
    }, [rotation]);
    // Handle pointer events
    const handlePointerDown = (e) => {
        // Stop any momentum
        velocityRef.current = 0;
        // Start tracking drag
        isDraggingRef.current = true;
        setIsDragging(true);
        // Capture start position and time
        startXRef.current = e.clientX;
        startTimeRef.current = Date.now();
        // Change cursor style
        document.body.style.cursor = 'grabbing';
        // Ensure we capture all pointer events
        e.target.setPointerCapture(e.pointerId);
    };
    const handlePointerMove = (e) => {
        if (!isDraggingRef.current)
            return;
        // Calculate rotation based on drag distance
        const deltaX = e.clientX - startXRef.current;
        // Apply rotation (more rotation for larger movements)
        rotationRef.current += deltaX * 0.2;
        rotation.set(rotationRef.current);
        // Calculate velocity
        const now = Date.now();
        const dt = now - startTimeRef.current;
        if (dt > 0) {
            velocityRef.current = (deltaX * 0.2) / dt;
        }
        // Update start position for next move
        startXRef.current = e.clientX;
        startTimeRef.current = now;
    };
    const handlePointerUp = (e) => {
        if (!isDraggingRef.current)
            return;
        // Release pointer capture
        e.target.releasePointerCapture(e.pointerId);
        // End drag state
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = 'auto';
        // Apply momentum
        const momentum = velocityRef.current * 100;
        if (Math.abs(momentum) > 1) {
            const momentumRotation = rotationRef.current + momentum;
            rotationRef.current = momentumRotation;
            // Apply with spring animation
            rotation.set(momentumRotation);
            // Gradually reduce velocity
            const reduceVelocity = () => {
                velocityRef.current *= 0.95;
                if (Math.abs(velocityRef.current) < 0.01) {
                    velocityRef.current = 0;
                }
            };
            const interval = setInterval(reduceVelocity, 50);
            setTimeout(() => clearInterval(interval), 2000);
        }
    };
    // Keep rotationRef in sync with motion value
    useEffect(() => {
        const unsubscribe = rotation.onChange(v => {
            rotationRef.current = v;
        });
        return unsubscribe;
    }, [rotation]);
    return (_jsx("div", { className: "days-carousel-3d", style: {
            perspective: "1200px",
            transformStyle: "preserve-3d",
        }, children: _jsx(motion.div, { className: "days-carousel-cylinder", style: {
                width: cylinderWidth,
                transform: cylinderTransform,
                transformStyle: "preserve-3d",
                willChange: "transform",
            }, onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp, onPointerCancel: handlePointerUp, onPointerLeave: handlePointerUp, children: days.map((day, i) => {
                // Check if this day is selected
                const isSelected = selectedDate &&
                    day.date.getDate() === selectedDate.getDate() &&
                    day.date.getMonth() === selectedDate.getMonth() &&
                    day.date.getFullYear() === selectedDate.getFullYear();
                // Calculate angle for this day in the carousel
                const angle = i * (360 / faceCount);
                return (_jsx(motion.div, { className: `day-card ${day.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${day.hasEvents ? 'has-events' : ''}`, style: {
                        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                        transformOrigin: "center",
                    }, onClick: () => !isDragging && onDaySelect(day), whileHover: {
                        scale: 1.05,
                        zIndex: 100,
                        transition: { duration: 0.2 }
                    }, children: _jsxs(motion.div, { className: "day-card-content", initial: { opacity: 0.7 }, animate: { opacity: 1 }, transition: { duration: 0.3 }, children: [_jsx("div", { className: "day-name", children: day.dayName }), _jsx("div", { className: "day-number", children: day.dayNumber }), day.hasEvents && _jsx("div", { className: "day-event-indicator" })] }) }, `day-${day.date.toISOString()}`));
            }) }) }));
});
export function ThreeDCalendarCarousel({ currentWeek, selectedDate, onSelectDate, eventsMap }) {
    // Format days data
    const days = useMemo(() => currentWeek.map(date => {
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
        const dateStr = date.toISOString().split('T')[0];
        const hasEvents = eventsMap ? eventsMap.get(dateStr) || false : false;
        return {
            date,
            dayName: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
            dayNumber: date.getDate(),
            isToday,
            hasEvents
        };
    }), [currentWeek, eventsMap]);
    const handleDaySelect = (day) => {
        onSelectDate(day.date);
    };
    return (_jsx("div", { className: "days-carousel-container", children: _jsx(DaysCarousel, { days: days, selectedDate: selectedDate, onDaySelect: handleDaySelect }) }));
}
export default ThreeDCalendarCarousel;
