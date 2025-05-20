import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../src/components/VerticalMarquee.css';
import './Booking.css';
import Marquee3D from './components/Marquee3D';
import LogoButton from './components/LogoButton';

// Equipment interface
interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  isAvailable: boolean;
}

// Room interface
interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  features: string[];
  isAvailable: boolean;
}

// Booking modal interface
interface BookingModalProps {
  type: 'equipment' | 'room';
  item: Equipment | Room;
  onClose: () => void;
  onBook: (startTime: string, endTime: string, email: string) => void;
}

// Generate fake equipment data
const generateEquipment = (): Equipment[] => {
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
const generateRooms = (): Room[] => {
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
const BookingModal: React.FC<BookingModalProps> = ({ type, item, onClose, onBook }) => {
  const [email, setEmail] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [errors, setErrors] = useState({ email: '', time: '' });
  
  // Get tomorrow's date in YYYY-MM-DDThh:mm format for the datetime-local input
  const getTomorrow = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };
  
  // Get tomorrow's date + 1 hour in YYYY-MM-DDThh:mm format
  const getTomorrowPlusHour = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  };
  
  useEffect(() => {
    setStartTime(getTomorrow());
    setEndTime(getTomorrowPlusHour());
  }, []);
  
  const validateForm = (): boolean => {
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
    } else {
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
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content booking-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Book {type === 'equipment' ? 'Equipment' : 'Room'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="booking-item-details">
            <h4>{item.name}</h4>
            <p className="booking-location">Location: {item.location}</p>
            {type === 'room' && (
              <div className="room-details">
                <p>Capacity: {(item as Room).capacity} people</p>
                <div className="room-features">
                  <p>Features:</p>
                  <ul>
                    {(item as Room).features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          <div className="booking-form">
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
              {errors.email && <div className="error-message">{errors.email}</div>}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input 
                  type="datetime-local" 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)}
                  min={getTomorrow()}
                />
              </div>
              
              <div className="form-group">
                <label>End Time</label>
                <input 
                  type="datetime-local" 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)}
                  min={startTime}
                />
              </div>
            </div>
            {errors.time && <div className="error-message">{errors.time}</div>}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="book-button" onClick={handleSubmit}>Book Now</button>
        </div>
      </div>
    </div>
  );
};

// Main Booking Component
const Booking: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedItem, setSelectedItem] = useState<Equipment | Room | null>(null);
  const [bookingType, setBookingType] = useState<'equipment' | 'room' | null>(null);
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
  const filteredEquipment = equipment.filter(item => 
    item.name.toLowerCase().includes(searchQuery.equipment.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.equipment.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.equipment.toLowerCase())
  );
  
  // Filter rooms based on search
  const filteredRooms = rooms.filter(item => 
    item.name.toLowerCase().includes(searchQuery.room.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.room.toLowerCase()) ||
    item.features.some(f => f.toLowerCase().includes(searchQuery.room.toLowerCase()))
  );
  
  // Handle booking
  const handleBooking = (startTime: string, endTime: string, email: string) => {
    if (!selectedItem || !bookingType) return;
    
    // In a real app, this would call an API to create the booking
    console.log(`Booking ${bookingType} ${selectedItem.id}:`);
    console.log(`Email: ${email}`);
    console.log(`Time: ${startTime} to ${endTime}`);
    
    // Update availability
    if (bookingType === 'equipment') {
      setEquipment(prev => 
        prev.map(item => 
          item.id === selectedItem.id ? { ...item, isAvailable: false } : item
        )
      );
    } else {
      setRooms(prev => 
        prev.map(item => 
          item.id === selectedItem.id ? { ...item, isAvailable: false } : item
        )
      );
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
  const openBookingModal = (type: 'equipment' | 'room', item: Equipment | Room) => {
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
            type: 'equipment' as const,
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
            type: 'room' as const,
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
  
  return (
    <div className="booking-page">
      <header className="booking-header">
        <LogoButton />
        <nav>
          <ul>
            <li><Link to="/">CAMPUS.AI</Link></li>
            <li><Link to="/calendar">Calendar</Link></li>
            <li className="active"><Link to="/booking">Booking</Link></li>
            <li><Link to="/user">User</Link></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
      </header>

      <main className="booking-main">
        <div className="booking-container">
          <div className="section-heading">
            <h1>Resource Booking</h1>
            <p>Book equipment and rooms for your academic needs</p>
          </div>
          
          {/* 3D Marquee section using Magic UI inspired component */}
          {availableItems.length > 0 && (
            <Marquee3D 
              items={availableItems}
              onItemClick={openBookingModal}
            />
          )}
          
          {bookingSuccess && (
            <div className="booking-success">
              <div className="success-icon">✓</div>
              <p>Booking successful! A confirmation has been sent to your email.</p>
            </div>
          )}
          
          <div className="booking-columns">
            <section className="equipment-section">
              <div className="section-header">
                <h2>Available Equipment</h2>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search equipment..."
                    value={searchQuery.equipment}
                    onChange={e => setSearchQuery(prev => ({ ...prev, equipment: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="item-grid-container">
                <div className="item-grid">
                  {filteredEquipment.length > 0 ? (
                    filteredEquipment.map(item => (
                      <div 
                        key={item.id} 
                        id={item.id}
                        className={`booking-item ${!item.isAvailable ? 'unavailable' : ''}`}
                        onClick={() => openBookingModal('equipment', item)}
                      >
                        <div className="item-icon">
                          <i className="icon-equipment"></i>
                        </div>
                        <div className="item-details">
                          <h3>{item.name}</h3>
                          <p>{item.location}</p>
                          <div className="item-features-row">
                            <div className="item-features">
                              <span className="feature-tag">{item.type}</span>
                            </div>
                            <div className={`availability-badge ${item.isAvailable ? 'available' : 'in-use'}`}>
                              {item.isAvailable ? 'Available' : 'In Use'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No equipment found matching your search.</div>
                  )}
                </div>
              </div>
            </section>
            
            <section className="room-section">
              <div className="section-header">
                <h2>Available Rooms</h2>
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery.room}
                    onChange={e => setSearchQuery(prev => ({ ...prev, room: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="item-grid-container">
                <div className="item-grid">
                  {filteredRooms.length > 0 ? (
                    filteredRooms.map(item => (
                      <div 
                        key={item.id} 
                        id={item.id}
                        className={`booking-item ${!item.isAvailable ? 'unavailable' : ''}`}
                        onClick={() => openBookingModal('room', item)}
                      >
                        <div className="item-icon">
                          <i className="icon-room"></i>
                        </div>
                        <div className="item-details">
                          <h3>{item.name}</h3>
                          <p>{item.location} • Capacity: {item.capacity}</p>
                          <div className="item-features-row">
                            <div className="item-features">
                              {item.features.slice(0, 2).map((feature, index) => (
                                <span key={index} className="feature-tag">{feature}</span>
                              ))}
                              {item.features.length > 2 && (
                                <span className="feature-tag more">+{item.features.length - 2}</span>
                              )}
                            </div>
                            <div className={`availability-badge ${item.isAvailable ? 'available' : 'in-use'}`}>
                              {item.isAvailable ? 'Available' : 'In Use'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">No rooms found matching your search.</div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      {selectedItem && bookingType && (
        <BookingModal
          type={bookingType}
          item={selectedItem}
          onClose={closeBookingModal}
          onBook={handleBooking}
        />
      )}
    </div>
  );
};

export default Booking; 