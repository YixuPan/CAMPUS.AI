import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Calendar.css';
import LogoButton from './components/LogoButton';
import CampusMap from './components/CampusMap';


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
  category: 'meeting' | 'reminder' | 'task' | 'social' | 'lecture' | 'exam';
  durationHours?: number;
  location?: string;
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

// New interface for card events
interface CardEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  duration: string;
  category: 'meeting' | 'reminder' | 'task' | 'social';
  attendees?: string[];
  location?: string;
}

// Calendar component
const Calendar: React.FC = () => {
  const navigate = useNavigate();
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
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [isWalletExpanded, setIsWalletExpanded] = useState(false);
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [isCardExpanding, setIsCardExpanding] = useState(false);
  const [isWalletVisible, setIsWalletVisible] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [isMapDialogOpen, setIsMapDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    coordinates: [number, number];
    description: string;
  } | undefined>();

  // Sample card events data
  const [cardEvents, setCardEvents] = useState<CardEvent[]>([
    {
      id: '1',
      title: 'Morning Lecture: Computer Science',
      description: 'Introduction to Algorithms and Data Structures',
      date: new Date(),
      time: '09:00',
      duration: '2h',
      category: 'meeting',
      attendees: ['Prof. Smith', 'Class A Students'],
      location: 'Lecture Hall A'
    },
    {
      id: '2',
      title: 'Group Project Meeting',
      description: 'Final project discussion with team members',
      date: new Date(Date.now() + 86400000), // Tomorrow
      time: '14:00',
      duration: '1h 30min',
      category: 'meeting',
      attendees: ['Sarah Johnson', 'Mike Chen', 'Lisa Brown'],
      location: 'Study Room 302'
    },
    {
      id: '3',
      title: 'Assignment Deadline',
      description: 'Submit Machine Learning Assignment',
      date: new Date(Date.now() + 172800000), // Day after tomorrow
      time: '23:59',
      duration: 'All day',
      category: 'task',
      location: 'Online Submission'
    },
    {
      id: '4',
      title: 'Campus Society Meetup',
      description: 'Tech Society Weekly Gathering',
      date: new Date(Date.now() + 259200000), // 3 days from now
      time: '18:00',
      duration: '2h',
      category: 'social',
      attendees: ['All Society Members'],
      location: 'Student Union Building'
    },
    {
      id: '5',
      title: 'Research Seminar',
      description: 'Guest Speaker on AI Ethics',
      date: new Date(Date.now() + 345600000), // 4 days from now
      time: '15:00',
      duration: '1h',
      category: 'meeting',
      location: 'Virtual Meeting Room'
    },
    {
      id: '6',
      title: 'Lab Session',
      description: 'Practical work on Database Systems',
      date: new Date(Date.now() + 432000000), // 5 days from now
      time: '10:00',
      duration: '3h',
      category: 'meeting',
      location: 'Computer Lab 2'
    },
    {
      id: '7',
      title: 'Study Group',
      description: 'Exam preparation with classmates',
      date: new Date(Date.now() + 518400000), // 6 days from now
      time: '16:00',
      duration: '2h',
      category: 'social',
      attendees: ['Study Group B'],
      location: 'Library Room 401'
    },
    {
      id: '8',
      title: 'Career Workshop',
      description: 'Resume Building and Interview Tips',
      date: new Date(Date.now() + 604800000), // 7 days from now
      time: '13:00',
      duration: '1h 30min',
      category: 'meeting',
      location: 'Career Center'
    }
  ]);

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
          category: apiEvent.category as 'meeting' | 'reminder' | 'task' | 'social' | 'lecture' | 'exam',
          durationHours: durationHours,
          location: apiEvent.description
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
        title: 'Morning Lecture',
        description: 'Introduction to Algorithms and Data Structures',
        date: new Date(baseDate.getTime() + (9 * 60 * 60 * 1000)), // 9:00 AM
        time: '09:00 AM',
        endTime: '11:00 AM',
        category: 'meeting',
        durationHours: 2,
        location: 'Lecture Hall A'
      },
      {
        id: 2,
        title: 'Study Group Session',
        description: 'Exam preparation with study group',
        date: new Date(baseDate.getTime() + (11.5 * 60 * 60 * 1000)), // 11:30 AM
        time: '11:30 AM',
        endTime: '13:00 PM',
        category: 'social',
        durationHours: 1.5,
        location: 'Library Room 401'
      },
      {
        id: 3,
        title: 'Research Meeting',
        description: 'Weekly research progress discussion',
        date: new Date(baseDate.getTime() + (14 * 60 * 60 * 1000)), // 2:00 PM
        time: '2:00 PM',
        endTime: '3:00 PM',
        category: 'meeting',
        durationHours: 1,
        location: 'Virtual Meeting Room'
      },
      {
        id: 4,
        title: 'Lab Work',
        description: 'Database Systems Practical',
        date: new Date(baseDate.getTime() + (15.5 * 60 * 60 * 1000)), // 3:30 PM
        time: '3:30 PM',
        endTime: '5:30 PM',
        category: 'task',
        durationHours: 2,
        location: 'Computer Lab 2'
      },
      {
        id: 5,
        title: 'Assignment Due',
        description: 'Submit Machine Learning Assignment',
        date: new Date(baseDate.getTime() + ((currentDate.getDay() + 1) * 24 * 60 * 60 * 1000) + (23.98 * 60 * 60 * 1000)), // Tomorrow 23:59
        time: '23:59 PM',
        category: 'reminder',
        durationHours: 0.1,
        location: 'Online Submission'
      },
      {
        id: 6,
        title: 'Tech Society Meeting',
        description: 'Weekly club gathering and activities',
        date: new Date(baseDate.getTime() + ((currentDate.getDay() + 2) * 24 * 60 * 60 * 1000) + (18 * 60 * 60 * 1000)), // Day after tomorrow 6 PM
        time: '6:00 PM',
        endTime: '8:00 PM',
        category: 'social',
        durationHours: 2,
        location: 'Student Union Building'
      },
      {
        id: 7,
        title: 'Career Workshop',
        description: 'Resume building and interview preparation',
        date: new Date(baseDate.getTime() + ((currentDate.getDay() + 3) * 24 * 60 * 60 * 1000) + (13 * 60 * 60 * 1000)), // 3 days later 1 PM
        time: '1:00 PM',
        endTime: '2:30 PM',
        category: 'meeting',
        durationHours: 1.5,
        location: 'Career Center'
      },
      {
        id: 8,
        title: 'Project Deadline',
        description: 'Final submission for group project',
        date: new Date(baseDate.getTime() + ((currentDate.getDay() + 4) * 24 * 60 * 60 * 1000) + (17 * 60 * 60 * 1000)), // 4 days later 5 PM
        time: '5:00 PM',
        category: 'reminder',
        durationHours: 0.1,
        location: 'Study Room 302'
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
        {/* Week Days Header */}
      
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
        category: newEvent.category as 'meeting' | 'reminder' | 'task' | 'social' | 'lecture' | 'exam',
        durationHours: newEvent.durationHours || 1,
        location: newEvent.location || ''
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

  // Get upcoming events sorted by date
  const getUpcomingEvents = (): CalendarEvent[] => {
    const now = new Date();
    return [
      {
        id: '1',
        title: 'Advanced Algorithms Lecture',
        description: 'Deep dive into graph algorithms and dynamic programming',
        date: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
        time: '10:00 AM',
        endTime: '12:00 PM',
        category: 'lecture',
        location: 'CS Building Room 401'
      },
      {
        id: '2',
        title: 'Project Team Meeting',
        description: 'Weekly sync-up with the mobile app development team',
        date: new Date(now.getTime() + 5 * 60 * 60 * 1000), // 5 hours from now
        time: '2:00 PM',
        endTime: '3:30 PM',
        category: 'meeting',
        location: 'Virtual Meeting Room 3'
      },
      {
        id: '3',
        title: 'Data Structures Lecture',
        description: 'Advanced topics in tree and graph structures',
        date: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        time: '11:00 AM',
        endTime: '12:30 PM',
        category: 'lecture',
        location: 'Engineering Hall 201'
      },
      {
        id: '4',
        title: 'Tech Society Meetup',
        description: 'Guest speaker from Google discussing AI/ML careers',
        date: new Date(now.getTime() + 26 * 60 * 60 * 1000),
        time: '4:00 PM',
        endTime: '6:00 PM',
        category: 'social',
        location: 'Student Center Auditorium'
      },
      {
        id: '5',
        title: 'Research Paper Task',
        description: 'Final submission for Machine Learning conference',
        date: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days from now
        time: '11:59 PM',
        category: 'task',
        location: 'Online Submission Portal'
      },
      {
        id: '6',
        title: 'Web Development Lecture',
        description: 'Hands-on session on React and Next.js',
        date: new Date(now.getTime() + 72 * 60 * 60 * 1000), // 3 days from now
        time: '2:00 PM',
        endTime: '5:00 PM',
        category: 'lecture',
        location: 'Tech Hub Lab 2'
      },
      {
        id: '7',
        title: 'Career Workshop Meeting',
        description: 'Resume review and mock interviews',
        date: new Date(now.getTime() + 96 * 60 * 60 * 1000), // 4 days from now
        time: '1:00 PM',
        endTime: '3:00 PM',
        category: 'meeting',
        location: 'Career Center'
      },
      {
        id: '8',
        title: 'Machine Learning Lecture',
        description: 'Neural Networks and Deep Learning fundamentals',
        date: new Date(now.getTime() + 120 * 60 * 60 * 1000), // 5 days from now
        time: '10:00 AM',
        endTime: '11:30 AM',
        category: 'lecture',
        location: 'Conference Room A'
      },
      {
        id: '9',
        title: 'Hackathon Social',
        description: '24-hour coding challenge with amazing prizes',
        date: new Date(now.getTime() + 144 * 60 * 60 * 1000), // 6 days from now
        time: '9:00 AM',
        endTime: '9:00 AM',
        category: 'social',
        location: 'Innovation Center'
      },
      {
        id: '10',
        title: 'Algorithms Study Group',
        description: 'Final exam preparation with peers',
        date: new Date(now.getTime() + 168 * 60 * 60 * 1000), // 7 days from now
        time: '3:00 PM',
        endTime: '6:00 PM',
        category: 'meeting',
        location: 'Library Study Room 401'
      }
    ];
  };

  // Handle card click
  const handleCardClick = (index: number) => {
    if (index === 0) {
      // Yellow card - animate expansion to calendar dialog
      setIsCardExpanding(true);
      setTimeout(() => {
        setIsCalendarDialogOpen(true);
        setIsCardExpanding(false);
      }, 400);
    } else if (index === 1) {
      // Upcoming events card - show all events
      const upcoming = getUpcomingEvents();
      setUpcomingEvents(upcoming);
      setEventFilter(null); // Reset filter
      setIsWalletVisible(true);
    } else if (index === 2) {
      // Yuni card - navigate to app page and trigger calendar scheduling
      localStorage.setItem('startYuniChat', 'true');
      localStorage.setItem('yuniAction', 'calendar-schedule');
      navigate('/app');
    } else if (index === 3) {
      // Location card - show 3D map
      // Get next event's location
      const nextEvent = getUpcomingEvents()[0];
      if (nextEvent && nextEvent.location) {
        setSelectedLocation({
          name: nextEvent.title,
          coordinates: getLocationCoordinates(nextEvent.location),
          description: `${nextEvent.description}\nLocation: ${nextEvent.location}`
        });
        setIsMapDialogOpen(true);
      }
    } else {
      // Other cards - existing wallet behavior
      if (selectedCard === index && isWalletExpanded) {
        setIsWalletExpanded(false);
        setTimeout(() => setSelectedCard(null), 300);
      } else {
        setSelectedCard(index);
        setIsWalletExpanded(true);
      }
    }
  };

  // Helper function to get coordinates for campus locations
  const getLocationCoordinates = (location: string): [number, number] => {
    const locationMap: { [key: string]: [number, number] } = {
      'CS Building Room 401': [-0.1795, 51.4985],
      'Engineering Hall 201': [-0.1776, 51.4977],
      'Student Center Auditorium': [-0.1749, 51.4988],
      'Library Study Room 401': [-0.1766, 51.4982],
      'Virtual Meeting Room 3': [-0.1749, 51.4988], // Default to campus center
      'Tech Hub Lab 2': [-0.1757, 51.4979],
      'Career Center': [-0.1742, 51.4991],
      'Conference Room A': [-0.1761, 51.4986],
      'Innovation Center': [-0.1753, 51.4975],
    };
    
    return locationMap[location] || [-0.1749, 51.4988]; // Default to campus center
  };

  // Add bubble click handler
  const handleBubbleClick = (eventType: string) => {
    const upcoming = getUpcomingEvents();
    const filtered = upcoming.filter(event => event.category === eventType);
    setUpcomingEvents(filtered);
    setEventFilter(eventType);
    setIsWalletVisible(true);
  };

  // Format date for wallet display
  const formatWalletDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Handle card expansion
  const handleCardExpand = (eventId: string) => {
    setExpandedCardId(expandedCardId === eventId ? null : eventId);
  };

  const generateDailyEvents = (date: Date) => {
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (date.getDay() === 0 || date.getDay() === 6) {
      return [];
    }

    // Fixed events for each weekday
    const weekdayEvents = {
      1: [ // Monday
        {
          type: 'lecture',
          title: 'Computer Vision',
          time: '10:00'
        },
        {
          type: 'meeting',
          title: 'Project Team Meeting',
          time: '14:30'
        }
      ],
      2: [ // Tuesday
        {
          type: 'exam',
          title: 'Midterm Exam',
          time: '09:30'
        }
      ],
      3: [ // Wednesday
        {
          type: 'lecture',
          title: 'Data Structures',
          time: '11:00'
        },
        {
          type: 'task',
          title: 'Assignment Due',
          time: '16:00'
        }
      ],
      4: [ // Thursday
        {
          type: 'meeting',
          title: 'Research Group',
          time: '13:00'
        }
      ],
      5: [ // Friday
        {
          type: 'lecture',
          title: 'Software Engineering',
          time: '10:30'
        },
        {
          type: 'social',
          title: 'Tech Society Meetup',
          time: '15:00'
        }
      ]
    };

    // Return events for the current weekday
    return weekdayEvents[date.getDay() as keyof typeof weekdayEvents] || [];
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
        {/* Dashboard Cards */}
        <div className="dashboard-cards-container">
          <div className="dashboard-card my-calendar" onClick={() => handleCardClick(0)}>
            <div className="card-content">
              <div className="mini-week-calendar">
                <div className="mini-week-header">
                  {generateWeekDays().map((day, index) => {
                    const isToday = day.getDate() === new Date().getDate() && 
                                  day.getMonth() === new Date().getMonth() && 
                                  day.getFullYear() === new Date().getFullYear();
                    return (
                      <div key={index} className={`mini-day-column ${isToday ? 'today' : ''}`}>
                        <div className="mini-day-name">{DAYS[day.getDay()].substring(0, 3)}</div>
                        <div className="mini-day-number">{day.getDate()}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mini-week-events">
                  {generateWeekDays().map((day, index) => (
                    <div key={index} className="mini-day-events">
                      {generateDailyEvents(day).map((event, eventIndex) => (
                        <div 
                          key={eventIndex} 
                          className={`mini-event ${event.type}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event from bubbling up
                          }}
                        >
                          <div className="mini-event-time">{event.time}</div>
                          <div className="mini-event-title">{event.title}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
                     <div className="dashboard-card upcoming-event" onClick={() => handleCardClick(1)}>
            <div className="card-content">
              <h3>Upcoming Events</h3>
                             <div className="event-bubbles">
                <div 
                  className="event-bubble large lectures" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBubbleClick('lecture');
                  }}
                >
                  <span className="event-type">Lectures</span>
                  <div className="frequency-text">12 this week</div>
                </div>
                <div 
                  className="event-bubble medium meetings" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBubbleClick('meeting');
                  }}
                >
                  <span className="event-type">Meetings</span>
                  <div className="frequency-text">6 this week</div>
                </div>
                <div 
                  className="event-bubble small deadlines" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBubbleClick('task');
                  }}
                >
                  <span className="event-type">DDL</span>
                  <div className="frequency-text">3 this week</div>
                </div>
                <div 
                  className="event-bubble extra-small social" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBubbleClick('social');
                  }}
                >
                  <span className="event-type">Social</span>
                  <div className="frequency-text">2 this week</div>
                </div>
              </div>

            </div>
          </div>
          
          <div className="dashboard-card ai-schedule" onClick={() => handleCardClick(2)}>
            <div className="card-content">
              <h3>Calendar help with Yuni</h3>
              <div className="help-suggestions">
                <div className="help-suggestions-scroll">
                  <div className="help-suggestion-item" style={{ background: 'rgba(74, 144, 226, 0.1)' }} onClick={(e) => {
                    e.stopPropagation();
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'schedule-meeting');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#4A90E2' }}>💬</div>
                    <div className="help-text">Book me a meeting with my project team</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(126, 211, 33, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'today-schedule');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#7ED321' }}>📅</div>
                    <div className="help-text">What's my schedule for today?</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(245, 166, 35, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'next-location');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#F5A623' }}>📍</div>
                    <div className="help-text">Take me to my next event location</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(189, 16, 224, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'find-room');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#BD10E0' }}>🔍</div>
                    <div className="help-text">Find me an available room for next hour</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(255, 91, 91, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'next-deadline');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#FF5B5B' }}>⏰</div>
                    <div className="help-text">How much time do I have until my next deadline?</div>
                  </div>
                  {/* Duplicate items for smooth infinite scroll */}
                  <div className="help-suggestion-item" style={{ background: 'rgba(74, 144, 226, 0.1)' }} onClick={(e) => {
                    e.stopPropagation();
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'schedule-meeting');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#4A90E2' }}>💬</div>
                    <div className="help-text">Book me a meeting with my project team</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(126, 211, 33, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'today-schedule');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#7ED321' }}>📅</div>
                    <div className="help-text">What's my schedule for today?</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(245, 166, 35, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'next-location');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#F5A623' }}>📍</div>
                    <div className="help-text">Take me to my next event location</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(189, 16, 224, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'find-room');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#BD10E0' }}>🔍</div>
                    <div className="help-text">Find me an available room for next hour</div>
                  </div>
                  <div className="help-suggestion-item" style={{ background: 'rgba(255, 91, 91, 0.1)' }} onClick={() => {
                    localStorage.setItem('startYuniChat', 'true');
                    localStorage.setItem('yuniAction', 'next-deadline');
                    navigate('/app');
                  }}>
                    <div className="help-icon" style={{ background: '#FF5B5B' }}>⏰</div>
                    <div className="help-text">How much time do I have until my next deadline?</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-card location-event" onClick={() => handleCardClick(3)}>
            <div className="card-content">
              <div className="location-header">
                <h3>Next event at: <span>Imperial College London</span></h3>
              </div>
              <div className="map-preview">
                {/* Static map preview with navigation dark style - less dark than full dark */}
                <img 
                  src="https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/static/-0.1743,51.4982,15,0,60/400x280@2x?access_token=pk.eyJ1IjoicGFueXgiLCJhIjoiY21iNzBmajd1MDVmaTJtcDlldDF1N3N3diJ9.1_MmzxAAUJx0uDG4IG9ARA"
                  alt="Imperial College London Map Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div className="map-preview-marker"></div>
              </div>
              <div className="location-overlay">
                <h3>South Kensington Campus</h3>
                <div className="location-details">
                  <span className="location-pin"></span>
                  EEE Building Room 408
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Dialog */}
        {isCalendarDialogOpen && (
          <div className="calendar-dialog-overlay" onClick={() => setIsCalendarDialogOpen(false)}>
            <div className="calendar-dialog yellow-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="calendar-dialog-header">
                <h2>Calendar</h2>
                <button 
                  className="close-dialog-btn"
                  onClick={() => setIsCalendarDialogOpen(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="calendar-dialog-content">
                <div className="calendar-view-selector">
                  <button 
                    onClick={() => handleViewChange('week')} 
                    className={calendarView === 'week' ? 'active' : ''}
                  >
                    Weekly
                  </button>
                  <button 
                    onClick={() => handleViewChange('month')} 
                    className={calendarView === 'month' ? 'active' : ''}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => handleViewChange('year')} 
                    className={calendarView === 'year' ? 'active' : ''}
                  >
                    Yearly
                  </button>
                </div>

                <div className="calendar-navigation">
                  <button onClick={
                    calendarView === 'week' ? goToPreviousWeek : 
                    calendarView === 'month' ? goToPreviousMonth : 
                    goToPreviousYear
                  } className="nav-btn">
                    ←
                  </button>
                  <h3>{formatDateRange()}</h3>
                  <button onClick={
                    calendarView === 'week' ? goToNextWeek : 
                    calendarView === 'month' ? goToNextMonth : 
                    goToNextYear
                  } className="nav-btn">
                    →
                  </button>
                </div>

                <div className="calendar-display">
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
                                          e.stopPropagation();
                                          handleEventClick(event);
                                        }}
                                      >
                                        {event.title}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
                <label>Location</label>
                <input 
                  type="text" 
                  value={newEvent.location} 
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="e.g. Room 302"
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
                  <option value="lecture">Lecture</option>
                  <option value="exam">Exam</option>
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

        {/* Wallet Overlay */}
        <div className={`wallet-overlay ${isWalletVisible ? 'visible' : ''}`}>
          <div className="wallet-container">
            <div className="wallet-header">
              <h2>
                {eventFilter ? `${eventFilter.charAt(0).toUpperCase() + eventFilter.slice(1)} Events` : 'Upcoming Events'}
                {eventFilter && (
                  <button 
                    className="clear-filter"
                    onClick={() => {
                      setEventFilter(null);
                      setUpcomingEvents(getUpcomingEvents());
                    }}
                  >
                    Show All
                  </button>
                )}
              </h2>
              <button className="wallet-close" onClick={() => setIsWalletVisible(false)}>×</button>
            </div>
            <div className="wallet-cards">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className={`wallet-card ${event.category} ${expandedCardId === event.id.toString() ? 'expanded' : ''}`}
                  onClick={() => handleCardExpand(event.id.toString())}
                >
                  <div className="wallet-card-header">
                    <h3 className="wallet-card-title">{event.title}</h3>
                    <div className="wallet-card-time-container">
                      <span className="wallet-card-time">{event.time}</span>
                      <span className="wallet-card-day">
                        {event.date.toLocaleDateString('en-US', { weekday: 'long' })}
                      </span>
                    </div>
                  </div>
                  <div className="wallet-card-details">
                    <div className="wallet-card-detail">
                      <span className="wallet-card-detail-label">Date:</span>
                      <span>{formatWalletDate(event.date)}</span>
                    </div>
                    {event.endTime && (
                      <div className="wallet-card-detail">
                        <span className="wallet-card-detail-label">Duration:</span>
                        <span>{event.time} - {event.endTime}</span>
                      </div>
                    )}
                    {event.description && (
                      <div className="wallet-card-detail">
                        <span className="wallet-card-detail-label">Details:</span>
                        <span>{event.description}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="wallet-card-detail">
                        <span className="wallet-card-detail-label">Location:</span>
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add CampusMap component */}
        <CampusMap
          isOpen={isMapDialogOpen}
          onClose={() => setIsMapDialogOpen(false)}
          location={selectedLocation}
        />
      </main>
    </div>
  );
};

export default Calendar; 