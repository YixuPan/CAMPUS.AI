import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './User.css';
import LogoButton from './components/LogoButton';
// API URL - using the same as the Calendar component
const API_URL = 'http://localhost:9000';
// Time zone for UK London
const UK_TIME_ZONE = 'Europe/London';
// Convert ISO string to UK London time
const isoToUKTime = (isoString) => {
    const date = new Date(isoString);
    return new Date(date.toLocaleString('en-US', { timeZone: UK_TIME_ZONE }));
};
// Format time (HH:MM AM/PM)
const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};
// Format date (Day Month DD, YYYY)
const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};
// User component
const User = () => {
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // Fetch upcoming events from API
    const fetchUpcomingEvents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Get current date and date 3 months ahead
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 3);
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
                return {
                    id: apiEvent.id,
                    title: apiEvent.title,
                    description: apiEvent.description,
                    date: startDate,
                    time: formatTime(startDate),
                    endTime: formatTime(endDate),
                    category: apiEvent.category,
                    isCheckedIn: false
                };
            });
            // Sort by date (ascending)
            transformedEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
            setUpcomingEvents(transformedEvents);
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
    // Set sample events as fallback
    const setSampleEvents = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        setUpcomingEvents([
            {
                id: 1,
                title: 'Team Standup',
                description: 'Daily team check-in',
                date: tomorrow,
                time: '10:00 AM',
                endTime: '10:30 AM',
                category: 'meeting',
                isCheckedIn: false
            },
            {
                id: 2,
                title: 'Project Review',
                description: 'Review of current projects',
                date: tomorrow,
                time: '2:00 PM',
                endTime: '3:00 PM',
                category: 'meeting',
                isCheckedIn: false
            },
            {
                id: 3,
                title: 'Team Building',
                description: 'Virtual team building activity',
                date: nextWeek,
                time: '4:00 PM',
                endTime: '5:00 PM',
                category: 'social',
                isCheckedIn: false
            }
        ]);
    };
    // Generate sample attendance data
    const generateAttendanceData = () => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June'];
        // Create more realistic trend data with a gradual improvement
        const attendanceData = [
            { month: 'January', meetings: 18, attended: 12, onTime: 8, late: 4, rate: 66.7 },
            { month: 'February', meetings: 22, attended: 16, onTime: 11, late: 5, rate: 72.7 },
            { month: 'March', meetings: 20, attended: 16, onTime: 14, late: 2, rate: 80.0 },
            { month: 'April', meetings: 21, attended: 19, onTime: 16, late: 3, rate: 90.5 },
            { month: 'May', meetings: 23, attended: 21, onTime: 19, late: 2, rate: 91.3 },
            { month: 'June', meetings: 24, attended: 23, onTime: 21, late: 2, rate: 95.8 }
        ];
        return attendanceData;
    };
    // Render attendance chart
    const renderAttendanceChart = () => {
        return (_jsxs("div", { className: "attendance-chart", children: [_jsx("div", { className: "chart-header", children: _jsx("h3", { children: "Attendance Rate Trend" }) }), _jsx("div", { className: "chart-bars", children: attendanceData.map((data, index) => {
                        return (_jsxs("div", { className: "chart-bar-container", children: [_jsx("div", { className: "chart-bar", style: {
                                        height: `${data.rate}%`,
                                        backgroundColor: `rgba(32, ${96 + (index * 20)}, 255, ${0.5 + (index * 0.1)})`
                                    }, title: `${data.month}: ${data.rate.toFixed(1)}%` }), _jsx("div", { className: "chart-label", children: data.month.substring(0, 3) }), _jsxs("div", { className: "chart-value", children: [data.rate.toFixed(1), "%"] })] }, index));
                    }) })] }));
    };
    // Handle check-in
    const handleCheckIn = (eventId) => {
        setUpcomingEvents(prevEvents => prevEvents.map(event => event.id === eventId
            ? { ...event, isCheckedIn: true }
            : event));
    };
    // Fetch data on component mount
    useEffect(() => {
        fetchUpcomingEvents();
        setAttendanceData(generateAttendanceData());
    }, []);
    return (_jsxs("div", { className: "user-page", children: [_jsxs("header", { className: "user-header", children: [_jsx(LogoButton, {}), _jsx("nav", { children: _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/", children: "CAMPUS.AI" }) }), _jsx("li", { children: _jsx(Link, { to: "/calendar", children: "Calendar" }) }), _jsx("li", { children: _jsx(Link, { to: "/booking", children: "Booking" }) }), _jsx("li", { className: "active", children: _jsx(Link, { to: "/user", children: "User" }) }), _jsx("li", { children: _jsx("a", { href: "#about", children: "About" }) })] }) })] }), _jsx("main", { className: "user-main", children: _jsxs("div", { className: "user-container", children: [_jsxs("div", { className: "user-info", children: [_jsx("div", { className: "user-avatar", children: _jsx("div", { className: "avatar-circle", children: "AI" }) }), _jsxs("div", { className: "user-details", children: [_jsx("h1", { children: "CAMPUS.AI" }), _jsx("p", { children: "Student" }), _jsx("p", { children: "CAMPUS_AI@example.com" })] })] }), _jsxs("div", { className: "user-content", children: [_jsxs("section", { className: "events-section", children: [_jsx("h2", { children: "Upcoming Events" }), isLoading && (_jsxs("div", { className: "events-loading", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Loading events..." })] })), error && (_jsxs("div", { className: "events-error", children: [_jsxs("p", { children: ["Error: ", error] }), _jsx("p", { children: "Showing sample events as fallback." })] })), _jsx("div", { className: "events-list", children: upcomingEvents.length > 0 ? (upcomingEvents.map(event => (_jsxs("div", { className: `event-card ${event.category}`, children: [_jsxs("div", { className: "event-date-time", children: [_jsx("div", { className: "event-date", children: formatDate(event.date) }), _jsxs("div", { className: "event-time", children: [event.time, " - ", event.endTime] })] }), _jsxs("div", { className: "event-details", children: [_jsx("h3", { children: event.title }), _jsx("p", { children: event.description })] }), _jsx("div", { className: "event-actions", children: event.isCheckedIn ? (_jsx("button", { className: "checked-in-button", disabled: true, children: "\u2713 Checked In" })) : (_jsx("button", { className: "check-in-button", onClick: () => handleCheckIn(event.id), children: "Check In" })) })] }, event.id)))) : (_jsx("div", { className: "no-events", children: "No upcoming events found." })) })] }), _jsxs("section", { className: "attendance-section", children: [_jsx("h2", { children: "Attendance Rate" }), _jsxs("div", { className: "attendance-data-container", children: [_jsx("div", { className: "attendance-chart-container", children: renderAttendanceChart() }), _jsx("div", { className: "attendance-table", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Month" }), _jsx("th", { children: "Total Meetings" }), _jsx("th", { children: "Attended" }), _jsx("th", { children: "Attendance Rate" }), _jsx("th", { children: "On Time" }), _jsx("th", { children: "Late" })] }) }), _jsx("tbody", { children: attendanceData.map((data, index) => (_jsxs("tr", { children: [_jsx("td", { children: data.month }), _jsx("td", { children: data.meetings }), _jsx("td", { children: data.attended }), _jsxs("td", { children: [data.rate.toFixed(1), "%"] }), _jsx("td", { children: data.onTime }), _jsx("td", { children: data.late })] }, index))) })] }) })] })] })] })] }) })] }));
};
export default User;
