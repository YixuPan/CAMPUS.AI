import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './User.css';
import LogoButton from './components/LogoButton';

// API URL - using the same as the Calendar component
const API_URL = 'http://localhost:9000';

// Time zone for UK London
const UK_TIME_ZONE = 'Europe/London';

// Interface for event
interface Event {
  id: string | number;
  title: string;
  description: string;
  date: Date;
  time: string;
  endTime?: string;
  category: 'meeting' | 'reminder' | 'task' | 'social';
  isCheckedIn?: boolean;
}

// Interface for attendance data
interface AttendanceData {
  month: string;
  meetings: number;
  attended: number;
  rate: number;
  onTime: number;
  late: number;
}

// Convert ISO string to UK London time
const isoToUKTime = (isoString: string): Date => {
  const date = new Date(isoString);
  return new Date(date.toLocaleString('en-US', { timeZone: UK_TIME_ZONE }));
};

// Format time (HH:MM AM/PM)
const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Format date (Day Month DD, YYYY)
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// User component
const User: React.FC = () => {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const transformedEvents: Event[] = data.events.map((apiEvent: any) => {
        const startDate = isoToUKTime(apiEvent.start);
        const endDate = isoToUKTime(apiEvent.end);
        
        return {
          id: apiEvent.id,
          title: apiEvent.title,
          description: apiEvent.description,
          date: startDate,
          time: formatTime(startDate),
          endTime: formatTime(endDate),
          category: apiEvent.category as 'meeting' | 'reminder' | 'task' | 'social',
          isCheckedIn: false
        };
      });
      
      // Sort by date (ascending)
      transformedEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      setUpcomingEvents(transformedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(`Failed to fetch events: ${err instanceof Error ? err.message : String(err)}`);
      
      // Set sample events as fallback
      setSampleEvents();
    } finally {
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
    return (
      <div className="attendance-chart">
        <div className="chart-header">
          <h3>Attendance Rate Trend</h3>
        </div>
        <div className="chart-bars">
          {attendanceData.map((data, index) => {
            return (
              <div className="chart-bar-container" key={index}>
                <div 
                  className="chart-bar" 
                  style={{ 
                    height: `${data.rate}%`,
                    backgroundColor: `rgba(32, ${96 + (index * 20)}, 255, ${0.5 + (index * 0.1)})`
                  }}
                  title={`${data.month}: ${data.rate.toFixed(1)}%`}
                ></div>
                <div className="chart-label">{data.month.substring(0, 3)}</div>
                <div className="chart-value">{data.rate.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Handle check-in
  const handleCheckIn = (eventId: string | number) => {
    setUpcomingEvents(prevEvents => 
      prevEvents.map(event => 
        event.id === eventId 
          ? { ...event, isCheckedIn: true } 
          : event
      )
    );
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchUpcomingEvents();
    setAttendanceData(generateAttendanceData());
  }, []);

  return (
    <div className="user-page">
      <header className="user-header">
        <LogoButton />
        <nav>
          <ul>
            <li><Link to="/">CAMPUS.AI</Link></li>
            <li><Link to="/calendar">Calendar</Link></li>
            <li><Link to="/booking">Booking</Link></li>
            <li className="active"><Link to="/user">User</Link></li>
            <li><a href="#about">About</a></li>
          </ul>
        </nav>
      </header>

      <main className="user-main">
        <div className="user-container">
          <div className="user-info">
            <div className="user-avatar">
              <div className="avatar-circle">AI</div>
            </div>
            <div className="user-details">
              <h1>CAMPUS.AI</h1>
              <p>Student</p>
              <p>CAMPUS_AI@example.com</p>
            </div>
          </div>

          <div className="user-content">
            <section className="events-section">
              <h2>Upcoming Events</h2>
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="events-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading events...</p>
                </div>
              )}
              
              {/* Error Message */}
              {error && (
                <div className="events-error">
                  <p>Error: {error}</p>
                  <p>Showing sample events as fallback.</p>
                </div>
              )}
              
              {/* Events List */}
              <div className="events-list">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map(event => (
                    <div key={event.id} className={`event-card ${event.category}`}>
                      <div className="event-date-time">
                        <div className="event-date">{formatDate(event.date)}</div>
                        <div className="event-time">{event.time} - {event.endTime}</div>
                      </div>
                      <div className="event-details">
                        <h3>{event.title}</h3>
                        <p>{event.description}</p>
                      </div>
                      <div className="event-actions">
                        {event.isCheckedIn ? (
                          <button className="checked-in-button" disabled>
                            ✓ Checked In
                          </button>
                        ) : (
                          <button 
                            className="check-in-button"
                            onClick={() => handleCheckIn(event.id)}
                          >
                            Check In
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-events">No upcoming events found.</div>
                )}
              </div>
            </section>

            <section className="attendance-section">
              <h2>Attendance Rate</h2>
              
              <div className="attendance-data-container">
                <div className="attendance-chart-container">
                  {renderAttendanceChart()}
                </div>
                
                {/* Excel-like table for attendance */}
                <div className="attendance-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Total Meetings</th>
                        <th>Attended</th>
                        <th>Attendance Rate</th>
                        <th>On Time</th>
                        <th>Late</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((data, index) => (
                        <tr key={index}>
                          <td>{data.month}</td>
                          <td>{data.meetings}</td>
                          <td>{data.attended}</td>
                          <td>{data.rate.toFixed(1)}%</td>
                          <td>{data.onTime}</td>
                          <td>{data.late}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default User; 