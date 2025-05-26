"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion, useAnimation, useMotionValue, useTransform, } from "framer-motion";
// Make sure you import these styles in your component or page that uses the carousel
// import "../shared.css"
// import "../Calendar.css"
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const IS_SERVER = typeof window === "undefined";
export function useMediaQuery(query, { defaultValue = false, initializeWithValue = true, } = {}) {
    const getMatches = (query) => {
        if (IS_SERVER) {
            return defaultValue;
        }
        return window.matchMedia(query).matches;
    };
    const [matches, setMatches] = useState(() => {
        if (initializeWithValue) {
            return getMatches(query);
        }
        return defaultValue;
    });
    const handleChange = () => {
        setMatches(getMatches(query));
    };
    useIsomorphicLayoutEffect(() => {
        const matchMedia = window.matchMedia(query);
        handleChange();
        matchMedia.addEventListener("change", handleChange);
        return () => {
            matchMedia.removeEventListener("change", handleChange);
        };
    }, [query]);
    return matches;
}
const duration = 0.15;
const transition = { duration, ease: [0.32, 0.72, 0, 1] };
const WeekCarousel = memo(({ handleDaySelect, controls, days, isCarouselActive, selectedDate, }) => {
    const isScreenSizeSm = useMediaQuery("(max-width: 640px)");
    const cylinderWidth = isScreenSizeSm ? 900 : 1350;
    const faceCount = days.length;
    const faceWidth = cylinderWidth / faceCount;
    // Radius multiplier - CHANGE THIS VALUE to adjust carousel radius
    // Higher values = larger radius (cards further from center)
    // Lower values = smaller radius (cards closer to center)
    // Recommended range: 0.8 (compact) to 1.6 (very spread out)
    const RADIUS_MULTIPLIER = 2.5;
    const radius = cylinderWidth / (2 * Math.PI) * RADIUS_MULTIPLIER;
    const rotation = useMotionValue(0);
    const containerRef = useRef(null);
    // Custom card sizes - larger than defaults in CSS
    const cardWidth = 380;
    const cardHeight = 380;
    // Rotation speed multiplier - CHANGE THIS VALUE to adjust rotation speed
    // Higher values = faster rotation, Lower values = slower rotation
    // Recommended range: 2 (very slow) to 20 (very fast)
    const ROTATION_SPEED = 300;
    // Handle manual rotation with mouse or touch
    const handlePointerMove = (e) => {
        if (!isCarouselActive || !containerRef.current)
            return;
        // Only apply if pointer is down (dragging)
        if (e.buttons !== 1)
            return;
        // Get container width
        const containerWidth = containerRef.current.clientWidth;
        // Calculate rotation amount based on x movement - positive for natural direction
        const rotationAmount = (e.movementX / containerWidth) * ROTATION_SPEED;
        rotation.set(rotation.get() + rotationAmount);
        // Prevent default to avoid text selection and other browser behaviors
        e.preventDefault();
    };
    return (_jsx("div", { className: "days-carousel-3d", ref: containerRef, style: {
            width: "100%",
            maxWidth: "1400px",
            margin: "0 auto",
            cursor: isCarouselActive ? "grab" : "default",
            userSelect: "none",
            touchAction: "none"
        }, onPointerDown: () => {
            if (containerRef.current) {
                containerRef.current.style.cursor = "grabbing";
            }
        }, onPointerUp: () => {
            if (containerRef.current) {
                containerRef.current.style.cursor = "grab";
            }
        }, onPointerMove: handlePointerMove, children: _jsx(motion.div, { className: "days-carousel-cylinder", style: {
                width: cylinderWidth,
                transformStyle: "preserve-3d",
                height: cardHeight + 20,
            }, animate: controls, children: days.map((day, i) => {
                // Check if this day is selected
                const isSelected = selectedDate &&
                    day.date.getDate() === selectedDate.getDate() &&
                    day.date.getMonth() === selectedDate.getMonth() &&
                    day.date.getFullYear() === selectedDate.getFullYear();
                // Calculate angle for this day in the carousel
                const angle = i * (360 / faceCount);
                // Use a motion value that updates with rotation
                const itemRotation = useTransform(rotation, (value) => angle + value);
                return (_jsx(motion.div, { className: `day-card ${day.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${day.hasEvents ? 'has-events' : ''}`, style: {
                        transform: useTransform(itemRotation, (value) => `rotateY(${value}deg) translateZ(${radius}px)`),
                        width: `${cardWidth}px`,
                        height: `${cardHeight}px`,
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
                        perspective: "1000px",
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden"
                    }, onClick: () => handleDaySelect(day), children: _jsxs(motion.div, { className: "day-card-content", initial: { filter: "blur(2px)" }, animate: { filter: "blur(0px)" }, transition: transition, style: {
                            padding: "20px",
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                            background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
                            backdropFilter: "blur(5px)",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1)",
                            transformStyle: "preserve-3d",
                            position: "relative"
                        }, children: [_jsx("div", { style: {
                                    position: "absolute",
                                    top: "0",
                                    left: "0",
                                    right: "0",
                                    height: "20px",
                                    background: "linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)",
                                    transform: "translateZ(2px)",
                                    borderRadius: "12px 12px 0 0",
                                    pointerEvents: "none"
                                } }), _jsxs("div", { className: "day-header", style: {
                                    marginBottom: "16px",
                                    transform: "translateZ(5px)",
                                    position: "relative"
                                }, children: [_jsx("div", { className: "day-name", style: { fontSize: "1.2rem" }, children: day.dayName }), _jsx("div", { className: "day-number", style: { fontSize: "2.8rem" }, children: day.dayNumber })] }), _jsx("div", { className: "events-container", style: {
                                    flex: 1,
                                    overflow: "auto",
                                    marginTop: "10px",
                                    transform: "translateZ(3px)",
                                    position: "relative"
                                }, children: day.events && day.events.length > 0 ? (day.events.map((event, eventIndex) => (_jsxs("div", { className: "event-item", style: {
                                        background: "rgba(255, 255, 255, 0.1)",
                                        borderRadius: "8px",
                                        padding: "8px 12px",
                                        marginBottom: "8px",
                                        fontSize: "0.9rem",
                                        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                                        transform: "translateZ(2px)",
                                        border: "1px solid rgba(255,255,255,0.05)"
                                    }, children: [_jsx("div", { className: "event-title", style: { fontWeight: "bold" }, children: event.title }), _jsx("div", { className: "event-time", style: { fontSize: "0.8rem", opacity: 0.9 }, children: event.time }), _jsx("div", { className: "event-category", style: {
                                                fontSize: "0.7rem",
                                                opacity: 0.7,
                                                marginTop: "4px"
                                            }, children: event.category })] }, `event-${eventIndex}`)))) : (_jsx("div", { className: "no-events", style: {
                                        textAlign: "center",
                                        opacity: 0.6,
                                        fontSize: "0.9rem",
                                        marginTop: "20px"
                                    }, children: "No events" })) })] }) }, `key-${day.date.toISOString()}-${i}`));
            }) }) }));
});
export function ThreeDDaysCarousel({ currentWeek, selectedDate, onSelectDate, eventsMap = new Map() }) {
    const [isCarouselActive, setIsCarouselActive] = useState(true);
    const controls = useAnimation();
    // CHANGE THIS VALUE to adjust the overall height of the carousel section
    // Increase for larger cards or more space between carousel and calendar
    // Default: 240px, Recommended range for larger cards: 400-500px
    const CAROUSEL_HEIGHT = 580;
    // Format days data
    const days = useMemo(() => currentWeek.map(date => {
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
        const dateStr = date.toISOString().split('T')[0];
        // Get events for this specific date
        const events = eventsMap.get(dateStr) || [];
        const hasEvents = events.length > 0;
        return {
            date,
            dayName: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
            dayNumber: date.getDate(),
            isToday,
            hasEvents,
            events
        };
    }), [currentWeek, eventsMap]);
    const handleDaySelect = (day) => {
        onSelectDate(day.date);
    };
    return (_jsx("div", { className: "carousel-wrapper", style: {
            height: `${CAROUSEL_HEIGHT}px`, // Use the adjustable height constant
            width: "100%",
            maxWidth: "1400px",
            margin: "0 auto",
            perspective: "2000px", // Increased perspective for larger radius
        }, children: _jsx(WeekCarousel, { handleDaySelect: handleDaySelect, controls: controls, days: days, isCarouselActive: isCarouselActive, selectedDate: selectedDate }) }));
}
// For backward compatibility (don't remove)
export function ThreeDPhotoCarousel() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    // Generate a week of dates
    const currentWeek = useMemo(() => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            return day;
        });
    }, []);
    // Sample events map with actual event data
    const eventsMap = useMemo(() => {
        const map = new Map();
        // Helper function to format date keys consistently
        const formatDateKey = (date) => {
            return date.toISOString().split('T')[0];
        };
        // Today's events
        const today = new Date();
        map.set(formatDateKey(today), [
            {
                title: "Team Meeting",
                time: "9:00 AM - 10:00 AM",
                category: "Work"
            },
            {
                title: "Lunch with Team",
                time: "12:30 PM - 1:30 PM",
                category: "Social"
            }
        ]);
        // Get all days in current week and add sample events to specific days
        const daysInWeek = currentWeek.map(date => ({
            date,
            key: formatDateKey(date)
        }));
        // Add event to the second day of the week
        if (daysInWeek[1]) {
            map.set(daysInWeek[1].key, [
                {
                    title: "Project Deadline",
                    time: "2:00 PM - 3:00 PM",
                    category: "Work"
                }
            ]);
        }
        // Add event to the fourth day of the week
        if (daysInWeek[3]) {
            map.set(daysInWeek[3].key, [
                {
                    title: "Doctor Appointment",
                    time: "10:30 AM - 11:30 AM",
                    category: "Personal"
                }
            ]);
        }
        // Add event to the sixth day of the week
        if (daysInWeek[5]) {
            map.set(daysInWeek[5].key, [
                {
                    title: "Weekend Party",
                    time: "7:00 PM - 11:00 PM",
                    category: "Social"
                }
            ]);
        }
        return map;
    }, [currentWeek]);
    return (_jsx(ThreeDDaysCarousel, { currentWeek: currentWeek, selectedDate: selectedDate, onSelectDate: setSelectedDate, eventsMap: eventsMap }));
}
