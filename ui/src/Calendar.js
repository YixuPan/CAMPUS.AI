import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Calendar.css';
import LogoButton from './components/LogoButton';
import { ThreeDDaysCarousel } from './components/ui/three-d-carousel';
// Calendar date utilities
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// API URL
const API_URL = 'http://localhost:9000';
// Time zone for UK London
const UK_TIME_ZONE = 'Europe/London';
// Calendar component
const Calendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState('week');
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: new Date(),
        time: '',
        category: 'reminder',
        durationHours: 1
    });
    const [selectedEvent, setSelectedEvent] = useState(null);
    // Format date to UK London time
    const formatToUKTime = (date) => {
        return new Date(date.toLocaleString('en-US', { timeZone: UK_TIME_ZONE }));
    };
    // Convert ISO string to UK London time
    const isoToUKTime = (isoString) => {
        const date = new Date(isoString);
        return formatToUKTime(date);
    };
    // Function to fetch events from API
    const fetchEvents = async (startDate, endDate) => {
        setIsLoading(true);
        setError(null);
        try {
            // Format dates as ISO strings
            const startStr = startDate.toISOString();
            const endStr = endDate.toISOString();
            // Make API request
            const response = await fetch(`${API_URL}/calendar/events?start_date=${startStr}&end_date=${endStr}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Transform API events to our format with UK time zone
            const transformedEvents = data.events.map((apiEvent) => {
                const startDate = isoToUKTime(apiEvent.start);
                const endDate = isoToUKTime(apiEvent.end);
                // Calculate duration in hours
                const durationMs = endDate.getTime() - startDate.getTime();
                const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
                return {
                    id: apiEvent.id,
                    title: apiEvent.title,
                    description: apiEvent.description,
                    date: startDate,
                    time: formatTime(startDate),
                    endTime: formatTime(endDate),
                    category: apiEvent.category,
                    durationHours: durationHours
                };
            });
            setEvents(transformedEvents);
        }
        catch (err) {
            console.error('Error fetching events:', err);
            setError(`Failed to fetch events: ${err instanceof Error ? err.message : String(err)}`);
            // Set sample events as fallback
            setSampleEvents();
        }
        finally {
            setIsLoading(false);
        }
    };
    // Format time (HH:MM AM/PM)
    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };
    // Set sample events as fallback
    const setSampleEvents = () => {
        const now = new Date();
        const ukNow = formatToUKTime(now);
        const baseDate = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
        setEvents([
            {
                id: 1,
                title: 'Team Meeting',
                description: 'Discuss project progress',
                date: new Date(baseDate.getTime() + (10 * 60 * 60 * 1000)), // 10:00 AM
                time: '10:00 AM',
                endTime: '11:30 AM',
                category: 'meeting',
                durationHours: 1.5
            },
            {
                id: 2,
                title: 'Lunch with Alex',
                description: 'At Coastal Café',
                date: new Date(baseDate.getTime() + ((currentDate.getDay() + 1) * 24 * 60 * 60 * 1000) + (12.5 * 60 * 60 * 1000)), // Next day 12:30 PM
                time: '12:30 PM',
                endTime: '1:30 PM',
                category: 'social',
                durationHours: 1
            },
            {
                id: 3,
                title: 'Project Workshop',
                description: 'Planning and brainstorming session',
                date: new Date(baseDate.getTime() + (13 * 60 * 60 * 1000)), // 1:00 PM today
                time: '1:00 PM',
                endTime: '4:00 PM',
                category: 'meeting',
                durationHours: 3
            }
        ]);
    };
    // Fetch events whenever the current date or view changes
    useEffect(() => {
        let startDate, endDate;
        if (calendarView === 'week') {
            // For week view: start from Sunday of current week to Saturday
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            startDate = weekStart;
            endDate = weekEnd;
        }
        else if (calendarView === 'month') {
            // For month view: start from 1st of the month to last day
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            startDate = monthStart;
            endDate = monthEnd;
        }
        else {
            // For year view: full year
            const yearStart = new Date(currentDate.getFullYear(), 0, 1);
            const yearEnd = new Date(currentDate.getFullYear(), 11, 31);
            yearEnd.setHours(23, 59, 59, 999);
            startDate = yearStart;
            endDate = yearEnd;
        }
        fetchEvents(startDate, endDate);
    }, [currentDate, calendarView]);
    // Ensure animations keep running by not clearing localStorage animation flags
    useEffect(() => {
        // We don't clear the animation flags when navigating to the calendar
        // This ensures animations continue when returning to home page
        return () => {
            // Don't clear animation flags when navigating away
        };
    }, []);
    // Get days in month
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };
    // Get first day of month (0-6)
    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };
    // Generate calendar days array with proper padding
    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfMonth = getFirstDayOfMonth(year, month);
        const days = [];
        // Add empty cells for days before the first day of month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        // Add days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    };
    // Generate days for week view
    const generateWeekDays = () => {
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            days.push(day);
        }
        return days;
    };
    // Get events for the current week view
    const getEventsForWeek = () => {
        const weekDays = generateWeekDays();
        const startDate = weekDays[0];
        const endDate = weekDays[6];
        return events.filter(event => event.date >= startDate && event.date <= endDate);
    };
    // Generate hours for the week view
    const generateHours = () => {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            hours.push(i);
        }
        return hours;
    };
    // Format hour for display
    const formatHour = (hour) => {
        if (hour === 0)
            return '12 AM';
        if (hour < 12)
            return `${hour} AM`;
        if (hour === 12)
            return '12 PM';
        return `${hour - 12} PM`;
    };
    // Check if a date has events
    const hasEvents = (date) => {
        return events.some(event => event.date.getDate() === date.getDate() &&
            event.date.getMonth() === date.getMonth() &&
            event.date.getFullYear() === date.getFullYear());
    };
    // Get events for selected date
    const getEventsForDate = (date) => {
        return events.filter(event => event.date.getDate() === date.getDate() &&
            event.date.getMonth() === date.getMonth() &&
            event.date.getFullYear() === date.getFullYear());
    };
    // Get events for specific date and hour - includes events that span this hour
    const getEventsForHour = (date, hour) => {
        return events.filter(event => {
            // Check if event is on the same day
            const sameDay = event.date.getDate() === date.getDate() &&
                event.date.getMonth() === date.getMonth() &&
                event.date.getFullYear() === date.getFullYear();
            if (!sameDay)
                return false;
            // Get event hour
            const eventHour = event.date.getHours();
            // Get event end hour (calculated from duration)
            const durationHours = event.durationHours || 1;
            const eventEndHour = eventHour + durationHours;
            // Event includes this hour if:
            // 1. It starts at this hour, or
            // 2. It spans this hour (starts before and ends after)
            return eventHour === hour || (eventHour < hour && eventEndHour > hour);
        });
    };
    // Check if event starts at this hour
    const eventStartsAtHour = (event, hour) => {
        return event.date.getHours() === hour;
    };
    // Create a map of dates with events for the carousel
    const createEventsMap = () => {
        // Group events by date
        const eventsByDate = new Map();
        events.forEach(event => {
            const dateStr = event.date.toISOString().split('T')[0];
            if (!eventsByDate.has(dateStr)) {
                eventsByDate.set(dateStr, []);
            }
            const dateEvents = eventsByDate.get(dateStr) || [];
            dateEvents.push(event);
            eventsByDate.set(dateStr, dateEvents);
        });
        // Convert CalendarEvent[] to the format expected by ThreeDDaysCarousel
        const carouselEventsMap = new Map();
        eventsByDate.forEach((dateEvents, dateStr) => {
            const formattedEvents = dateEvents.map(event => ({
                title: event.title,
                time: event.time + (event.endTime ? ` - ${event.endTime}` : ''),
                category: event.category
            }));
            carouselEventsMap.set(dateStr, formattedEvents);
        });
        console.log("Created carousel events map:", carouselEventsMap);
        console.log("Map size:", carouselEventsMap.size);
        console.log("Map keys:", [...carouselEventsMap.keys()]);
        return carouselEventsMap;
    };
    // Render week view
    const renderWeekView = () => {
        const weekDays = generateWeekDays();
        const hours = generateHours();
        const eventsMap = createEventsMap();
        return (_jsxs("div", { className: "week-view", children: [_jsx("div", { className: "carousel-wrapper", children: _jsx(ThreeDDaysCarousel, { currentWeek: weekDays, selectedDate: selectedDate, onSelectDate: handleDateClick, eventsMap: eventsMap }) }), _jsx("div", { className: "week-header", children: weekDays.map((day, index) => {
                        const isToday = day.getDate() === new Date().getDate() &&
                            day.getMonth() === new Date().getMonth() &&
                            day.getFullYear() === new Date().getFullYear();
                        return (_jsxs("div", { className: `day-column-header ${isToday ? 'today' : ''}`, onClick: () => handleDateClick(day), children: [_jsx("div", { className: "day-name", children: DAYS[day.getDay()].substring(0, 3) }), _jsx("div", { className: "day-number", children: day.getDate() })] }, index));
                    }) }), _jsx("div", { className: "week-body", children: hours.map((hour, hourIndex) => (_jsxs("div", { className: "hour-row", children: [_jsx("div", { className: "hour-label", children: formatHour(hour) }), weekDays.map((day, dayIndex) => (_jsx("div", { className: "hour-cell", onClick: () => {
                                    const newDate = new Date(day);
                                    newDate.setHours(hour);
                                    handleDateClick(newDate);
                                }, children: getEventsForHour(day, hour).map((event, eventIndex) => (_jsxs("div", { className: `week-event ${event.category} ${event.durationHours && event.durationHours > 1 ? 'multi-hour' : ''}`, style: {
                                        height: event.durationHours ? `${Math.min(event.durationHours * 100, 100)}%` : '100%'
                                    }, onClick: (e) => {
                                        e.stopPropagation();
                                        handleEventClick(event);
                                    }, children: [_jsx("div", { className: "event-time", children: event.time }), _jsx("div", { className: "event-title", children: event.title })] }, eventIndex))) }, dayIndex)))] }, hourIndex))) })] }));
    };
    // Change week handlers
    const goToPreviousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };
    const goToNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };
    // Change month handlers
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
    };
    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
    };
    // Change year handlers
    const goToPreviousYear = () => {
        setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
    };
    const goToNextYear = () => {
        setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
    };
    // Handle date selection
    const handleDateClick = (date) => {
        setSelectedDate(date);
    };
    // Handle view change
    const handleViewChange = (view) => {
        setCalendarView(view);
    };
    // Handle adding new event
    const handleAddEvent = () => {
        if (selectedDate && newEvent.title && newEvent.time) {
            const eventToAdd = {
                id: events.length + 1,
                title: newEvent.title || '',
                description: newEvent.description || '',
                date: selectedDate,
                time: newEvent.time || '',
                endTime: newEvent.endTime || '',
                category: newEvent.category,
                durationHours: newEvent.durationHours || 1
            };
            setEvents([...events, eventToAdd]);
            setNewEvent({
                title: '',
                description: '',
                time: '',
                category: 'reminder',
                durationHours: 1
            });
            setShowModal(false);
        }
    };
    // Format date for display (e.g., "May 18-24, 2025")
    const formatDateRange = () => {
        if (calendarView === 'week') {
            const weekDays = generateWeekDays();
            const startDate = weekDays[0];
            const endDate = weekDays[6];
            // If same month
            if (startDate.getMonth() === endDate.getMonth()) {
                return `${MONTHS[startDate.getMonth()]} ${startDate.getDate()}-${endDate.getDate()}, ${startDate.getFullYear()}`;
            }
            // Different months
            return `${MONTHS[startDate.getMonth()]} ${startDate.getDate()}-${MONTHS[endDate.getMonth()]} ${endDate.getDate()}, ${startDate.getFullYear()}`;
        }
        if (calendarView === 'month') {
            return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        return currentDate.getFullYear().toString();
    };
    // Function to handle event click
    const handleEventClick = (event) => {
        setSelectedEvent(event);
    };
    // Function to close event details
    const closeEventDetails = () => {
        setSelectedEvent(null);
    };
    // Render calendar UI
    return (_jsxs("div", { className: "calendar-page", children: [_jsxs("header", { className: "calendar-header", children: [_jsx(LogoButton, {}), _jsx("nav", { children: _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/", children: "CampusSphere" }) }), _jsx("li", { className: "active", children: _jsx(Link, { to: "/calendar", children: "Calendar" }) }), _jsx("li", { children: _jsx(Link, { to: "/booking", children: "Booking" }) }), _jsx("li", { children: _jsx(Link, { to: "/user", children: "User" }) }), _jsx("li", { children: _jsx("a", { href: "#about", children: "About" }) })] }) })] }), _jsxs("main", { className: "calendar-main", children: [_jsxs("div", { className: "calendar-container", children: [_jsx("div", { className: "calendar-controls", children: _jsxs("div", { className: "view-controls", children: [_jsxs("div", { className: "view-selector", children: [_jsx("button", { onClick: () => handleViewChange('week'), className: calendarView === 'week' ? 'active' : '', children: "Week" }), _jsx("button", { onClick: () => handleViewChange('month'), className: calendarView === 'month' ? 'active' : '', children: "Month" }), _jsx("button", { onClick: () => handleViewChange('year'), className: calendarView === 'year' ? 'active' : '', children: "Year" })] }), _jsxs("div", { className: "time-navigation", children: [_jsx("button", { onClick: calendarView === 'week' ? goToPreviousWeek :
                                                        calendarView === 'month' ? goToPreviousMonth :
                                                            goToPreviousYear, className: "nav-button", children: "\u2190" }), _jsx("h2", { children: formatDateRange() }), _jsx("button", { onClick: calendarView === 'week' ? goToNextWeek :
                                                        calendarView === 'month' ? goToNextMonth :
                                                            goToNextYear, className: "nav-button", children: "\u2192" })] }), _jsx("button", { className: "today-button", onClick: () => setCurrentDate(new Date()), children: "Today" })] }) }), isLoading && (_jsxs("div", { className: "calendar-loading", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Loading calendar events..." })] })), error && (_jsxs("div", { className: "calendar-error", children: [_jsxs("p", { children: ["Error: ", error] }), _jsx("p", { children: "Showing sample events as fallback." })] })), calendarView === 'week' && renderWeekView(), calendarView === 'month' && (_jsxs("div", { className: "month-view", children: [_jsx("div", { className: "calendar-days-header", children: DAYS.map(day => (_jsx("div", { className: "day-name", children: day.substring(0, 3) }, day))) }), _jsx("div", { className: "calendar-days", children: generateCalendarDays().map((day, index) => (_jsx("div", { className: `calendar-day ${!day ? 'empty' : ''} ${day && selectedDate && day.getDate() === selectedDate.getDate() && day.getMonth() === selectedDate.getMonth() ? 'selected' : ''} ${day && day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() && day.getFullYear() === new Date().getFullYear() ? 'today' : ''}`, onClick: () => day && handleDateClick(day), children: day && (_jsxs(_Fragment, { children: [_jsx("span", { className: "day-number", children: day.getDate() }), hasEvents(day) && (_jsxs("div", { className: "day-events", children: [getEventsForDate(day).slice(0, 2).map(event => (_jsx("div", { className: `day-event-indicator ${event.category}`, onClick: (e) => {
                                                                    e.stopPropagation(); // Prevent triggering date selection
                                                                    handleEventClick(event);
                                                                }, children: event.title }, event.id))), getEventsForDate(day).length > 2 && (_jsxs("div", { className: "more-events", onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedDate(day);
                                                                }, children: ["+", getEventsForDate(day).length - 2, " more"] }))] }))] })) }, index))) })] })), calendarView === 'year' && (_jsx("div", { className: "year-view", children: Array.from({ length: 12 }, (_, i) => i).map(month => (_jsxs("div", { className: "year-month", children: [_jsx("h3", { children: MONTHS[month] }), _jsxs("div", { className: "mini-month", children: [_jsx("div", { className: "mini-days-header", children: DAYS.map(day => (_jsx("div", { className: "mini-day-name", children: day.charAt(0) }, day))) }), _jsx("div", { className: "mini-days", children: (() => {
                                                        const firstDay = new Date(currentDate.getFullYear(), month, 1).getDay();
                                                        const daysInMonth = new Date(currentDate.getFullYear(), month + 1, 0).getDate();
                                                        const days = [];
                                                        // Empty cells for days before start of month
                                                        for (let i = 0; i < firstDay; i++) {
                                                            days.push(_jsx("div", { className: "mini-day empty" }, `empty-${i}`));
                                                        }
                                                        // Days of the month
                                                        for (let i = 1; i <= daysInMonth; i++) {
                                                            const date = new Date(currentDate.getFullYear(), month, i);
                                                            const hasEvent = hasEvents(date);
                                                            const isToday = date.getDate() === new Date().getDate() &&
                                                                date.getMonth() === new Date().getMonth() &&
                                                                date.getFullYear() === new Date().getFullYear();
                                                            days.push(_jsx("div", { className: `mini-day ${hasEvent ? 'has-event' : ''} ${isToday ? 'today' : ''}`, onClick: () => {
                                                                    setCurrentDate(date);
                                                                    setCalendarView('month');
                                                                }, children: i }, i));
                                                        }
                                                        return days;
                                                    })() })] })] }, month))) })), selectedDate && calendarView === 'month' && (_jsxs("div", { className: "events-panel", children: [_jsxs("div", { className: "events-header", children: [_jsxs("h3", { children: ["Events for ", selectedDate.getDate(), " ", MONTHS[selectedDate.getMonth()], ", ", selectedDate.getFullYear()] }), _jsx("button", { className: "add-event-button", onClick: () => setShowModal(true), children: "+ Add Event" })] }), _jsx("div", { className: "events-list", children: getEventsForDate(selectedDate).length > 0 ? (getEventsForDate(selectedDate).map(event => (_jsxs("div", { className: `event-card ${event.category}`, children: [_jsxs("div", { className: "event-time", children: [event.time, event.endTime ? ` - ${event.endTime}` : ''] }), _jsxs("div", { className: "event-details", children: [_jsx("h4", { children: event.title }), _jsx("p", { children: event.description })] }), _jsx("div", { className: "event-category", children: event.category })] }, event.id)))) : (_jsx("div", { className: "no-events", children: "No events scheduled for this day." })) })] }))] }), showModal && (_jsx("div", { className: "modal-overlay", children: _jsxs("div", { className: "modal-content", children: [_jsx("h3", { children: "Add New Event" }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Title" }), _jsx("input", { type: "text", value: newEvent.title, onChange: (e) => setNewEvent({ ...newEvent, title: e.target.value }), placeholder: "Event title" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Description" }), _jsx("textarea", { value: newEvent.description, onChange: (e) => setNewEvent({ ...newEvent, description: e.target.value }), placeholder: "Event description" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Time" }), _jsx("input", { type: "text", value: newEvent.time, onChange: (e) => setNewEvent({ ...newEvent, time: e.target.value }), placeholder: "e.g. 3:30 PM" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Time (optional)" }), _jsx("input", { type: "text", value: newEvent.endTime, onChange: (e) => setNewEvent({ ...newEvent, endTime: e.target.value }), placeholder: "e.g. 4:30 PM" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Duration (hours)" }), _jsx("input", { type: "number", value: newEvent.durationHours, onChange: (e) => setNewEvent({ ...newEvent, durationHours: Number(e.target.value) }), placeholder: "e.g. 1.5" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Category" }), _jsxs("select", { value: newEvent.category, onChange: (e) => setNewEvent({ ...newEvent, category: e.target.value }), children: [_jsx("option", { value: "meeting", children: "Meeting" }), _jsx("option", { value: "reminder", children: "Reminder" }), _jsx("option", { value: "task", children: "Task" }), _jsx("option", { value: "social", children: "Social" })] })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "cancel-button", onClick: () => setShowModal(false), children: "Cancel" }), _jsx("button", { className: "save-button", onClick: handleAddEvent, children: "Save Event" })] })] }) })), selectedEvent && (_jsx("div", { className: "modal-overlay", onClick: closeEventDetails, children: _jsxs("div", { className: "modal-content event-detail-modal", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: `event-detail-header ${selectedEvent.category}`, children: [_jsx("h3", { children: selectedEvent.title }), _jsx("button", { className: "close-button", onClick: closeEventDetails, children: "\u00D7" })] }), _jsxs("div", { className: "event-detail-body", children: [_jsxs("div", { className: "event-detail-time", children: [_jsx("span", { className: "detail-label", children: "Time:" }), selectedEvent.time, selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''] }), _jsxs("div", { className: "event-detail-date", children: [_jsx("span", { className: "detail-label", children: "Date:" }), selectedEvent.date.toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })] }), _jsxs("div", { className: "event-detail-category", children: [_jsx("span", { className: "detail-label", children: "Category:" }), _jsx("span", { className: `category-badge ${selectedEvent.category}`, children: selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1) })] }), _jsxs("div", { className: "event-detail-description", children: [_jsx("span", { className: "detail-label", children: "Description:" }), _jsx("p", { children: selectedEvent.description || 'No description provided' })] })] })] }) }))] })] }));
};
export default Calendar;
