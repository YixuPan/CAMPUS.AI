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

// Event interface
interface CalendarEvent {
  id: string | number;
  title: string;
  description: string;
  date: Date;
  time: string;
  endTime?: string;
  category: 'meeting' | 'reminder' | 'task' | 'social';
  durationHours?: number; // Added duration in hours
}

// API Response Event interface
interface ApiEvent {
  id: string;
  title: string;
  description: string;
  start: string;  // ISO string
  end: string;    // ISO string
  category: string;
}

// View type
type CalendarViewType = 'week' | 'month' | 'year';

// Calendar component
const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarViewType>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    date: new Date(),
    time: '',
    category: 'reminder',
    durationHours: 1
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  // Format date to UK London time
  const formatToUKTime = (date: Date): Date => {
    return new Date(date.toLocaleString('en-US', { timeZone: UK_TIME_ZONE }));
  };

  // Convert ISO string to UK London time
  const isoToUKTime = (isoString: string): Date => {
    const date = new Date(isoString);
    return formatToUKTime(date);
  };

  // Function to fetch events from API
  const fetchEvents = async (startDate: Date, endDate: Date) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Format dates as ISO strings
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();
      
      // Make API request
      const response = await fetch(`http://localhost:9001/calendar/sync?start_date=${startStr}&end_date=${endStr}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform API events to our format with UK time zone
      const transformedEvents: CalendarEvent[] = data.events.map((apiEvent: ApiEvent) => {
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
          category: apiEvent.category as 'meeting' | 'reminder' | 'task' | 'social',
          durationHours: durationHours
        };
      });
      
      setEvents(transformedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(`Failed to fetch events: ${err instanceof Error ? err.message : String(err)}`);
      
      // Set sample events as fallback
      setSampleEvents();
    } finally {
      setIsLoading(false);
    }
  };

  // Format time (HH:MM AM/PM)
  const formatTime = (date: Date): string => {
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
    let startDate: Date, endDate: Date;
    
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
    } else if (calendarView === 'month') {
      // For month view: start from 1st of the month to last day
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      startDate = monthStart;
      endDate = monthEnd;
    } else {
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
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0-6)
  const getFirstDayOfMonth = (year: number, month: number) => {
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

  // Generate hours for the week view
  const generateHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  // Check if a date has events
  const hasEvents = (date: Date) => {
    return events.some(event => 
      event.date.getDate() === date.getDate() && 
      event.date.getMonth() === date.getMonth() && 
      event.date.getFullYear() === date.getFullYear()
    );
  };

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.getDate() === date.getDate() && 
      event.date.getMonth() === date.getMonth() && 
      event.date.getFullYear() === date.getFullYear()
    );
  };

  // Get events for specific date and hour - includes events that span this hour
  const getEventsForHour = (date: Date, hour: number) => {
    return events.filter(event => {
      // Check if event is on the same day
      const sameDay = event.date.getDate() === date.getDate() && 
      event.date.getMonth() === date.getMonth() && 
                      event.date.getFullYear() === date.getFullYear();
      
      if (!sameDay) return false;
      
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

  // Create a map of dates with events for the carousel
  const createEventsMap = () => {
    // Group events by date
    const eventsByDate = new Map<string, CalendarEvent[]>();
    
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
    const carouselEventsMap = new Map<string, any[]>();
    
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
    
    return (
      <div className="week-view">
        {/* 3D Days Carousel */}
        <div className="carousel-wrapper">
          <ThreeDDaysCarousel 
            currentWeek={weekDays} 
            selectedDate={selectedDate}
            onSelectDate={handleDateClick}
            eventsMap={eventsMap}
          />
        </div>
      
        {/* Regular week header below the carousel */}
        <div className="week-header">
          {weekDays.map((day, index) => {
            const isToday = day.getDate() === new Date().getDate() && 
                            day.getMonth() === new Date().getMonth() && 
                            day.getFullYear() === new Date().getFullYear();
            
            return (
              <div 
                key={index} 
                className={`day-column-header ${isToday ? 'today' : ''}`}
                onClick={() => handleDateClick(day)}
              >
                <div className="day-name">{DAYS[day.getDay()].substring(0, 3)}</div>
                <div className="day-number">{day.getDate()}</div>
              </div>
            );
          })}
        </div>
        
        {/* Week grid with hours and events */}
        <div className="week-body">
          {hours.map((hour, hourIndex) => (
            <div key={hourIndex} className="hour-row">
              <div className="hour-label">
                {formatHour(hour)}
              </div>
              
              {weekDays.map((day, dayIndex) => (
                <div 
                  key={dayIndex} 
                  className="hour-cell"
                  onClick={() => {
                    const newDate = new Date(day);
                    newDate.setHours(hour);
                    handleDateClick(newDate);
                  }}
                >
                  {getEventsForHour(day, hour).map((event, eventIndex) => (
                    <div 
                      key={eventIndex}
                      className={`week-event ${event.category} ${event.durationHours && event.durationHours > 1 ? 'multi-hour' : ''}`}
                      style={{
                        height: event.durationHours ? `${Math.min(event.durationHours * 100, 100)}%` : '100%'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <div className="event-time">{event.time}</div>
                      <div className="event-title">{event.title}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
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
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle view change
  const handleViewChange = (view: CalendarViewType) => {
    setCalendarView(view);
  };

  // Handle adding new event
  const handleAddEvent = () => {
    if (selectedDate && newEvent.title && newEvent.time) {
      const eventToAdd: CalendarEvent = {
        id: events.length + 1,
        title: newEvent.title || '',
        description: newEvent.description || '',
        date: selectedDate,
        time: newEvent.time || '',
        endTime: newEvent.endTime || '',
        category: newEvent.category as 'meeting' | 'reminder' | 'task' | 'social',
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
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  // Function to close event details
  const closeEventDetails = () => {
    setSelectedEvent(null);
  };

  // Test the connection to the calendar API
  const testCalendarConnection = async () => {
    setIsLoading(true);
    setConnectionStatus(null);
    
    try {
      const response = await fetch('http://localhost:9001/calendar/test');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setConnectionStatus(`Connected as ${data.user.displayName} (${data.user.email}). Found ${data.calendars.count} calendars.`);
      } else {
        setConnectionStatus(`Connection issue: ${data.message}`);
      }
    } catch (err) {
      console.error('Error testing calendar connection:', err);
      setConnectionStatus(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render calendar UI
  return (
    <div className="calendar-page">
      <header className="calendar-header">
        <LogoButton />
        <nav>
          <ul>
            <li><Link to="/app">CampusSphere</Link></li>
            <li className="active"><Link to="/calendar">Calendar</Link></li>
            <li><Link to="/booking">Booking</Link></li>
            <li><Link to="/user">User</Link></li>
          </ul>
        </nav>
      </header>

      <main className="calendar-main">
        <div className="calendar-container">
          <div className="calendar-controls">
            <div className="view-controls">
              <div className="view-selector">
                <button 
                  onClick={() => handleViewChange('week')} 
                  className={calendarView === 'week' ? 'active' : ''}
                >
                  Week
                </button>
                <button 
                  onClick={() => handleViewChange('month')} 
                  className={calendarView === 'month' ? 'active' : ''}
                >
                  Month
                </button>
                <button 
                  onClick={() => handleViewChange('year')} 
                  className={calendarView === 'year' ? 'active' : ''}
                >
                  Year
                </button>
              </div>
              
              <div className="time-navigation">
                <button onClick={
                  calendarView === 'week' ? goToPreviousWeek : 
                  calendarView === 'month' ? goToPreviousMonth : 
                  goToPreviousYear
                } className="nav-button">
                  &#8592;
                </button>
                <h2>{formatDateRange()}</h2>
                <button onClick={
                  calendarView === 'week' ? goToNextWeek : 
                  calendarView === 'month' ? goToNextMonth : 
                  goToNextYear
                } className="nav-button">
                  &#8594;
                </button>
              </div>
              
              <button className="today-button" onClick={() => setCurrentDate(new Date())}>
                Today
              </button>
              
              <button className="test-connection-button" onClick={testCalendarConnection}>
                Test Connection
              </button>
            </div>

            <div className="view-buttons">
              <button 
                className={calendarView === 'week' ? 'active' : ''} 
                onClick={() => handleViewChange('week')}
              >Week</button>
              <button 
                className={calendarView === 'month' ? 'active' : ''} 
                onClick={() => handleViewChange('month')}
              >Month</button>
              <button 
                className={calendarView === 'year' ? 'active' : ''} 
                onClick={() => handleViewChange('year')}
              >Year</button>
              <button onClick={testCalendarConnection}>
                Test Connection
              </button>
            </div>
          </div>

          {/* Loading Indicator and Error Message */}
          {isLoading && (
            <div className="calendar-loading">
              <div className="loading-spinner"></div>
              <p>Loading calendar events...</p>
            </div>
          )}
          
          {error && (
            <div className="calendar-error">
              <p>Error: {error}</p>
              <p>Showing sample events as fallback.</p>
            </div>
          )}

          {connectionStatus && (
            <div className={`connection-status ${connectionStatus.includes('Connected') ? 'success' : 'error'}`}>
              {connectionStatus}
            </div>
          )}

          {calendarView === 'week' && renderWeekView()}

          {calendarView === 'month' && (
            <div className="month-view">
              <div className="calendar-days-header">
                {DAYS.map(day => (
                  <div key={day} className="day-name">{day.substring(0, 3)}</div>
                ))}
              </div>
              
              <div className="calendar-days">
                {generateCalendarDays().map((day, index) => (
                  <div 
                    key={index} 
                    className={`calendar-day ${!day ? 'empty' : ''} ${day && selectedDate && day.getDate() === selectedDate.getDate() && day.getMonth() === selectedDate.getMonth() ? 'selected' : ''} ${day && day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() && day.getFullYear() === new Date().getFullYear() ? 'today' : ''}`}
                    onClick={() => day && handleDateClick(day)}
                  >
                    {day && (
                      <>
                        <span className="day-number">{day.getDate()}</span>
                        {hasEvents(day) && (
                          <div className="day-events">
                            {getEventsForDate(day).slice(0, 2).map(event => (
                              <div 
                                key={event.id} 
                                className={`day-event-indicator ${event.category}`}
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering date selection
                                  handleEventClick(event);
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                            {getEventsForDate(day).length > 2 && (
                              <div 
                                className="more-events" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(day);
                                }}
                              >
                                +{getEventsForDate(day).length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {calendarView === 'year' && (
            <div className="year-view">
              {Array.from({ length: 12 }, (_, i) => i).map(month => (
                <div key={month} className="year-month">
                  <h3>{MONTHS[month]}</h3>
                  <div className="mini-month">
                    <div className="mini-days-header">
                      {DAYS.map(day => (
                        <div key={day} className="mini-day-name">{day.charAt(0)}</div>
                      ))}
                    </div>
                    <div className="mini-days">
                      {(() => {
                        const firstDay = new Date(currentDate.getFullYear(), month, 1).getDay();
                        const daysInMonth = new Date(currentDate.getFullYear(), month + 1, 0).getDate();
                        
                        const days = [];
                        // Empty cells for days before start of month
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<div key={`empty-${i}`} className="mini-day empty"></div>);
                        }
                        
                        // Days of the month
                        for (let i = 1; i <= daysInMonth; i++) {
                          const date = new Date(currentDate.getFullYear(), month, i);
                          const hasEvent = hasEvents(date);
                          const isToday = date.getDate() === new Date().getDate() && 
                                          date.getMonth() === new Date().getMonth() && 
                                          date.getFullYear() === new Date().getFullYear();
                          
                          days.push(
                            <div 
                              key={i} 
                              className={`mini-day ${hasEvent ? 'has-event' : ''} ${isToday ? 'today' : ''}`}
                              onClick={() => {
                                setCurrentDate(date);
                                setCalendarView('month');
                              }}
                            >
                              {i}
                            </div>
                          );
                        }
                        
                        return days;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedDate && calendarView === 'month' && (
            <div className="events-panel">
              <div className="events-header">
                <h3>Events for {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}, {selectedDate.getFullYear()}</h3>
                <button className="add-event-button" onClick={() => setShowModal(true)}>+ Add Event</button>
              </div>
              
              <div className="events-list">
                {getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className={`event-card ${event.category}`}>
                      <div className="event-time">{event.time}{event.endTime ? ` - ${event.endTime}` : ''}</div>
                      <div className="event-details">
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                      </div>
                      <div className="event-category">{event.category}</div>
                    </div>
                  ))
                ) : (
                  <div className="no-events">No events scheduled for this day.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal for adding new events */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Add New Event</h3>
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  value={newEvent.title} 
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Event title"
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newEvent.description} 
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Event description"
                />
              </div>
              
              <div className="form-group">
                <label>Start Time</label>
                <input 
                  type="text" 
                  value={newEvent.time} 
                  onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                  placeholder="e.g. 3:30 PM"
                />
              </div>
              
              <div className="form-group">
                <label>End Time (optional)</label>
                <input 
                  type="text" 
                  value={newEvent.endTime} 
                  onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                  placeholder="e.g. 4:30 PM"
                />
              </div>
              
              <div className="form-group">
                <label>Duration (hours)</label>
                <input 
                  type="number" 
                  value={newEvent.durationHours} 
                  onChange={(e) => setNewEvent({...newEvent, durationHours: Number(e.target.value)})}
                  placeholder="e.g. 1.5"
                />
              </div>
              
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={newEvent.category} 
                  onChange={(e) => setNewEvent({...newEvent, category: e.target.value as any})}
                >
                  <option value="meeting">Meeting</option>
                  <option value="reminder">Reminder</option>
                  <option value="task">Task</option>
                  <option value="social">Social</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button className="cancel-button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="save-button" onClick={handleAddEvent}>Save Event</button>
              </div>
            </div>
          </div>
        )}

        {/* Event detail modal */}
        {selectedEvent && (
          <div className="modal-overlay" onClick={closeEventDetails}>
            <div className="modal-content event-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className={`event-detail-header ${selectedEvent.category}`}>
                <h3>{selectedEvent.title}</h3>
                <button className="close-button" onClick={closeEventDetails}>×</button>
              </div>
              
              <div className="event-detail-body">
                <div className="event-detail-time">
                  <span className="detail-label">Time:</span> 
                  {selectedEvent.time}{selectedEvent.endTime ? ` - ${selectedEvent.endTime}` : ''}
                </div>
                
                <div className="event-detail-date">
                  <span className="detail-label">Date:</span>
                  {selectedEvent.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                
                <div className="event-detail-category">
                  <span className="detail-label">Category:</span> 
                  <span className={`category-badge ${selectedEvent.category}`}>
                    {selectedEvent.category.charAt(0).toUpperCase() + selectedEvent.category.slice(1)}
                  </span>
                </div>
                
                <div className="event-detail-description">
                  <span className="detail-label">Description:</span>
                  <p>{selectedEvent.description || 'No description provided'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Calendar; 