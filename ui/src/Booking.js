import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../src/components/VerticalMarquee.css';
import './Booking.css';
import Marquee3D from './components/Marquee3D';
import LogoButton from './components/LogoButton';
// Generate fake equipment data
const generateEquipment = () => {
    const equipmentTypes = [
        'Projector', 'Printer', '3D Printer', 'Laptop', 'Camera',
        'Microphone', 'iPad', 'VR Headset', 'Drawing Tablet', 'Audio Mixer',
        'Drone', 'DSLR Camera', 'Video Camera', 'MacBook Pro', 'iMac',
        'Gaming PC', 'Digital Scanner', 'Smart Board', 'Streaming Kit', 'Recording Studio'
    ];
    const locations = ['Library', 'Media Lab', 'Computer Lab', 'Engineering Building', 'Arts Center'];
    return Array.from({ length: 20 }, (_, i) => {
        const type = equipmentTypes[i];
        const id = `${type.replace(/\s+/g, '').toLowerCase()}${(i + 1).toString().padStart(2, '0')}`;
        return {
            id,
            name: `${type} ${(i + 1).toString().padStart(2, '0')}`,
            type,
            location: locations[Math.floor(Math.random() * locations.length)],
            isAvailable: Math.random() > 0.3 // 70% chance of being available
        };
    });
};
// Generate fake room data
const generateRooms = () => {
    const roomPrefixes = ['LT', 'CR', 'LAB', 'MR', 'SR', 'BR', 'AR', 'DR', 'ER', 'TR', 'VR', 'PR', 'HR', 'GR', 'FR', 'IR', 'JR', 'KR', 'UR', 'QR'];
    const roomFeatures = [
        ['Projector', 'Whiteboard', 'Video Conference'],
        ['Projector', 'Computers', 'Whiteboard'],
        ['3D Printers', 'Computers', 'Equipment Storage'],
        ['Video Conference', 'Display Screens', 'Microphones'],
        ['Whiteboard', 'Round Tables', 'Projector'],
        ['Computers', 'Dual Monitors', 'Whiteboard'],
        ['Green Screen', 'Cameras', 'Lighting Equipment'],
        ['Conference Phone', 'Projector', 'Whiteboard'],
        ['Drafting Tables', 'Art Supplies', 'Natural Lighting'],
        ['Lecture Podium', 'Tiered Seating', 'Surround Sound'],
        ['VR Equipment', 'Motion Tracking', 'Green Screen'],
        ['Recording Booth', 'Soundproofing', 'Mixing Equipment'],
        ['Medical Simulation', 'Hospital Beds', 'Medical Equipment'],
        ['Chemistry Workstations', 'Fume Hoods', 'Safety Equipment'],
        ['Language Lab', 'Headphones', 'Language Software'],
        ['Music Studio', 'Instruments', 'Sound Isolation'],
        ['Robotics Lab', 'Work Benches', 'Tool Storage'],
        ['Study Pods', 'Power Outlets', 'Whiteboards'],
        ['Collaboration Space', 'Modular Furniture', 'Interactive Displays'],
        ['Presentation Room', 'Conference Table', 'Video Wall']
    ];
    return Array.from({ length: 20 }, (_, i) => {
        const prefix = roomPrefixes[i];
        const roomNumber = (i + 1).toString().padStart(2, '0');
        const capacity = ((i % 3) + 1) * 10; // 10, 20, or 30 capacity
        return {
            id: `${prefix}${roomNumber}`,
            name: `${prefix} ${roomNumber}`,
            capacity,
            location: `Floor ${Math.floor(i / 5) + 1}`,
            features: roomFeatures[i],
            isAvailable: Math.random() > 0.4 // 60% chance of being available
        };
    });
};
// Booking Modal Component
const BookingModal = ({ type, item, onClose, onBook }) => {
    const [email, setEmail] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [errors, setErrors] = useState({ email: '', time: '' });
    // Get tomorrow's date in YYYY-MM-DDThh:mm format for the datetime-local input
    const getTomorrow = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow.toISOString().slice(0, 16);
    };
    // Get tomorrow's date + 1 hour in YYYY-MM-DDThh:mm format
    const getTomorrowPlusHour = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        return tomorrow.toISOString().slice(0, 16);
    };
    useEffect(() => {
        setStartTime(getTomorrow());
        setEndTime(getTomorrowPlusHour());
    }, []);
    const validateForm = () => {
        const newErrors = { email: '', time: '' };
        let isValid = true;
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            newErrors.email = 'Please enter a valid email address';
            isValid = false;
        }
        // Validate time
        if (!startTime || !endTime) {
            newErrors.time = 'Please select both start and end times';
            isValid = false;
        }
        else {
            const start = new Date(startTime);
            const end = new Date(endTime);
            if (end <= start) {
                newErrors.time = 'End time must be after start time';
                isValid = false;
            }
        }
        setErrors(newErrors);
        return isValid;
    };
    const handleSubmit = () => {
        if (validateForm()) {
            onBook(startTime, endTime, email);
        }
    };
    return (_jsx("div", { className: "modal-overlay", onClick: onClose, children: _jsxs("div", { className: "modal-content booking-modal", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h3", { children: ["Book ", type === 'equipment' ? 'Equipment' : 'Room'] }), _jsx("button", { className: "close-button", onClick: onClose, children: "\u00D7" })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "booking-item-details", children: [_jsx("h4", { children: item.name }), _jsxs("p", { className: "booking-location", children: ["Location: ", item.location] }), type === 'room' && (_jsxs("div", { className: "room-details", children: [_jsxs("p", { children: ["Capacity: ", item.capacity, " people"] }), _jsxs("div", { className: "room-features", children: [_jsx("p", { children: "Features:" }), _jsx("ul", { children: item.features.map((feature, index) => (_jsx("li", { children: feature }, index))) })] })] }))] }), _jsxs("div", { className: "booking-form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Email Address" }), _jsx("input", { type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "your.email@example.com" }), errors.email && _jsx("div", { className: "error-message", children: errors.email })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Start Time" }), _jsx("input", { type: "datetime-local", value: startTime, onChange: e => setStartTime(e.target.value), min: getTomorrow() })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "End Time" }), _jsx("input", { type: "datetime-local", value: endTime, onChange: e => setEndTime(e.target.value), min: startTime })] })] }), errors.time && _jsx("div", { className: "error-message", children: errors.time })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "cancel-button", onClick: onClose, children: "Cancel" }), _jsx("button", { className: "book-button", onClick: handleSubmit, children: "Book Now" })] })] }) }));
};
// Main Booking Component
const Booking = () => {
    const [equipment, setEquipment] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [bookingType, setBookingType] = useState(null);
    const [searchQuery, setSearchQuery] = useState({ equipment: '', room: '' });
    const [bookingSuccess, setBookingSuccess] = useState(false);
    // Initialize with fake data
    useEffect(() => {
        setEquipment(generateEquipment());
        setRooms(generateRooms());
    }, []);
    // Simulate real-time updates by changing availability every 15 seconds
    useEffect(() => {
        const simulateRealTimeUpdates = () => {
            // Update some equipment items
            setEquipment(prevEquipment => {
                // Select a random item to toggle
                const randomIndex = Math.floor(Math.random() * prevEquipment.length);
                return prevEquipment.map((item, index) => {
                    if (index === randomIndex) {
                        // Toggle availability
                        return { ...item, isAvailable: !item.isAvailable };
                    }
                    return item;
                });
            });
            // Update some room items
            setRooms(prevRooms => {
                // Select a random item to toggle
                const randomIndex = Math.floor(Math.random() * prevRooms.length);
                return prevRooms.map((item, index) => {
                    if (index === randomIndex) {
                        // Toggle availability
                        return { ...item, isAvailable: !item.isAvailable };
                    }
                    return item;
                });
            });
        };
        // Run update every 15 seconds
        const intervalId = setInterval(simulateRealTimeUpdates, 15000);
        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, []);
    // Filter equipment based on search
    const filteredEquipment = equipment.filter(item => item.name.toLowerCase().includes(searchQuery.equipment.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.equipment.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.equipment.toLowerCase()));
    // Filter rooms based on search
    const filteredRooms = rooms.filter(item => item.name.toLowerCase().includes(searchQuery.room.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.room.toLowerCase()) ||
        item.features.some(f => f.toLowerCase().includes(searchQuery.room.toLowerCase())));
    // Handle booking
    const handleBooking = (startTime, endTime, email) => {
        if (!selectedItem || !bookingType)
            return;
        // In a real app, this would call an API to create the booking
        console.log(`Booking ${bookingType} ${selectedItem.id}:`);
        console.log(`Email: ${email}`);
        console.log(`Time: ${startTime} to ${endTime}`);
        // Update availability
        if (bookingType === 'equipment') {
            setEquipment(prev => prev.map(item => item.id === selectedItem.id ? { ...item, isAvailable: false } : item));
        }
        else {
            setRooms(prev => prev.map(item => item.id === selectedItem.id ? { ...item, isAvailable: false } : item));
        }
        // Show success message and close modal
        setBookingSuccess(true);
        setSelectedItem(null);
        setBookingType(null);
        // Hide success message after 3 seconds
        setTimeout(() => {
            setBookingSuccess(false);
        }, 3000);
    };
    // Open booking modal
    const openBookingModal = (type, item) => {
        if (item.isAvailable) {
            setSelectedItem(item);
            setBookingType(type);
        }
    };
    // Close booking modal
    const closeBookingModal = () => {
        setSelectedItem(null);
        setBookingType(null);
    };
    // Get all available items for the 3D marquee
    const availableItems = React.useMemo(() => {
        // Make sure equipment is defined before filtering
        const equipmentItems = equipment && equipment.length > 0
            ? equipment
                .filter(item => item.isAvailable)
                .map(item => ({
                id: `eq-${item.id}`,
                name: item.name,
                type: 'equipment',
                location: item.location,
                icon: '📱',
                item: item
            }))
            : [];
        // Make sure rooms is defined before filtering
        const roomItems = rooms && rooms.length > 0
            ? rooms
                .filter(item => item.isAvailable)
                .map(item => ({
                id: `rm-${item.id}`,
                name: item.name,
                type: 'room',
                location: `${item.location} • ${item.capacity} seats`,
                icon: '🏢',
                item: item
            }))
            : [];
        // Log available items for debugging
        console.log("Equipment items:", equipmentItems.length);
        console.log("Room items:", roomItems.length);
        return [...equipmentItems, ...roomItems];
    }, [equipment, rooms]);
    return (_jsxs("div", { className: "booking-page", children: [_jsxs("header", { className: "booking-header", children: [_jsx(LogoButton, {}), _jsx("nav", { children: _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/", children: "CampusSphere" }) }), _jsx("li", { children: _jsx(Link, { to: "/calendar", children: "Calendar" }) }), _jsx("li", { className: "active", children: _jsx(Link, { to: "/booking", children: "Booking" }) }), _jsx("li", { children: _jsx(Link, { to: "/user", children: "User" }) }), _jsx("li", { children: _jsx("a", { href: "#about", children: "About" }) })] }) })] }), _jsx("main", { className: "booking-main", children: _jsxs("div", { className: "booking-container", children: [_jsxs("div", { className: "section-heading", children: [_jsx("h1", { children: "Resource Booking" }), _jsx("p", { children: "Book equipment and rooms for your academic needs" })] }), availableItems.length > 0 && (_jsx(Marquee3D, { items: availableItems, onItemClick: openBookingModal })), bookingSuccess && (_jsxs("div", { className: "booking-success", children: [_jsx("div", { className: "success-icon", children: "\u2713" }), _jsx("p", { children: "Booking successful! A confirmation has been sent to your email." })] })), _jsxs("div", { className: "booking-columns", children: [_jsxs("section", { className: "equipment-section", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "Available Equipment" }), _jsx("div", { className: "search-box", children: _jsx("input", { type: "text", placeholder: "Search equipment...", value: searchQuery.equipment, onChange: e => setSearchQuery(prev => ({ ...prev, equipment: e.target.value })) }) })] }), _jsx("div", { className: "item-grid-container", children: _jsx("div", { className: "item-grid", children: filteredEquipment.length > 0 ? (filteredEquipment.map(item => (_jsxs("div", { id: item.id, className: `booking-item ${!item.isAvailable ? 'unavailable' : ''}`, onClick: () => openBookingModal('equipment', item), children: [_jsx("div", { className: "item-icon", children: _jsx("i", { className: "icon-equipment" }) }), _jsxs("div", { className: "item-details", children: [_jsx("h3", { children: item.name }), _jsx("p", { children: item.location }), _jsxs("div", { className: "item-features-row", children: [_jsx("div", { className: "item-features", children: _jsx("span", { className: "feature-tag", children: item.type }) }), _jsx("div", { className: `availability-badge ${item.isAvailable ? 'available' : 'in-use'}`, children: item.isAvailable ? 'Available' : 'In Use' })] })] })] }, item.id)))) : (_jsx("div", { className: "no-results", children: "No equipment found matching your search." })) }) })] }), _jsxs("section", { className: "room-section", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "Available Rooms" }), _jsx("div", { className: "search-box", children: _jsx("input", { type: "text", placeholder: "Search rooms...", value: searchQuery.room, onChange: e => setSearchQuery(prev => ({ ...prev, room: e.target.value })) }) })] }), _jsx("div", { className: "item-grid-container", children: _jsx("div", { className: "item-grid", children: filteredRooms.length > 0 ? (filteredRooms.map(item => (_jsxs("div", { id: item.id, className: `booking-item ${!item.isAvailable ? 'unavailable' : ''}`, onClick: () => openBookingModal('room', item), children: [_jsx("div", { className: "item-icon", children: _jsx("i", { className: "icon-room" }) }), _jsxs("div", { className: "item-details", children: [_jsx("h3", { children: item.name }), _jsxs("p", { children: [item.location, " \u2022 Capacity: ", item.capacity] }), _jsxs("div", { className: "item-features-row", children: [_jsxs("div", { className: "item-features", children: [item.features.slice(0, 2).map((feature, index) => (_jsx("span", { className: "feature-tag", children: feature }, index))), item.features.length > 2 && (_jsxs("span", { className: "feature-tag more", children: ["+", item.features.length - 2] }))] }), _jsx("div", { className: `availability-badge ${item.isAvailable ? 'available' : 'in-use'}`, children: item.isAvailable ? 'Available' : 'In Use' })] })] })] }, item.id)))) : (_jsx("div", { className: "no-results", children: "No rooms found matching your search." })) }) })] })] })] }) }), selectedItem && bookingType && (_jsx(BookingModal, { type: bookingType, item: selectedItem, onClose: closeBookingModal, onBook: handleBooking }))] }));
};
export default Booking;
