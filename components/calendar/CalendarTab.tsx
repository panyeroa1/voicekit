
import React, { useState, useEffect, useMemo, FC } from 'react';
import { useCalendarStore, CalendarEvent } from '../../lib/state';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import c from 'classnames';

const EventItem: FC<{ event: CalendarEvent }> = ({ event }) => {
  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="event-item">
      {event.summary}
      <div className="event-tooltip">
        <div className="tooltip-title">{event.summary}</div>
        <div className="tooltip-detail">
          <span className="icon">schedule</span>
          <span>{`${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}</span>
        </div>
        {event.location && (
          <div className="tooltip-detail">
            <span className="icon">location_on</span>
            <span>{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
};


const CalendarTab: FC = () => {
  const { user } = useLiveAPIContext();
  const { events, fetchEvents } = useCalendarStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    if (user) {
      fetchEvents(user.id);
    }
  }, [user, fetchEvents]);

  const handlePrev = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === 'month') d.setMonth(d.getMonth() - 1);
      if (view === 'week') d.setDate(d.getDate() - 7);
      if (view === 'day') d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === 'month') d.setMonth(d.getMonth() + 1);
      if (view === 'week') d.setDate(d.getDate() + 7);
      if (view === 'day') d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const renderHeader = () => {
    let title = '';
    if (view === 'month') {
      title = currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      title = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else { // day
      title = currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    }

    return (
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={handleToday} className="calendar-today-button">Today</button>
          <button onClick={handlePrev} className="calendar-nav-button" aria-label="Previous period"><span className="icon">chevron_left</span></button>
          <button onClick={handleNext} className="calendar-nav-button" aria-label="Next period"><span className="icon">chevron_right</span></button>
          <span className="calendar-current-date">{title}</span>
        </div>
        <div className="calendar-view-switcher">
          <button onClick={() => setView('month')} className={c('view-switch-button', { active: view === 'month' })}>Month</button>
          <button onClick={() => setView('week')} className={c('view-switch-button', { active: view === 'week' })}>Week</button>
          <button onClick={() => setView('day')} className={c('view-switch-button', { active: view === 'day' })}>Day</button>
        </div>
      </div>
    );
  };
  
  const renderMonthView = () => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const startDate = new Date(year, month, 1);
    const startDayOfWeek = startDate.getDay(); // 0 (Sun) - 6 (Sat)
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Calculate previous month's days to show
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        const day = prevMonthDays - startDayOfWeek + i + 1;
        days.push(
            <div key={`prev-${i}`} className="calendar-day-cell other-month">
                <span className="day-number">{day}</span>
            </div>
        );
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayEvents = events.filter(e => new Date(e.startTime).toDateString() === date.toDateString());
        
        days.push(
          <div key={`current-${day}`} className={c("calendar-day-cell", {
              today: date.toDateString() === today.toDateString()
          })}>
            <span className="day-number">{day}</span>
            {dayEvents.map(event => <EventItem key={event.id} event={event} />)}
          </div>
        );
    }

    // Calculate next month's days to show
    const totalCells = 42; // 6 weeks for a standard calendar view
    const nextMonthStartDay = 1;
    let nextMonthDay = nextMonthStartDay;
    while(days.length < totalCells) {
        days.push(
            <div key={`next-${nextMonthDay}`} className="calendar-day-cell other-month">
                <span className="day-number">{nextMonthDay++}</span>
            </div>
        );
    }


    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="calendar-grid-container">
            <div className="calendar-weekdays">
                {weekdays.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="calendar-days-grid">{days}</div>
        </div>
    );
  };
  
  const renderWeekView = () => {
    const today = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dayEvents = events.filter(e => new Date(e.startTime).toDateString() === date.toDateString());
        
        days.push(
          <div key={i} className={c("calendar-day-cell", {
              today: date.toDateString() === today.toDateString()
          })}>
            <span className="day-number">{date.getDate()}</span>
            {dayEvents.map(event => <EventItem key={event.id} event={event} />)}
          </div>
        );
    }
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="calendar-grid-container">
            <div className="calendar-weekdays">
                {weekdays.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="calendar-days-grid">{days}</div>
        </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = events
      .filter(e => new Date(e.startTime).toDateString() === currentDate.toDateString())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    if (dayEvents.length === 0) {
      return <div className="no-events-message">No events scheduled for this day.</div>;
    }

    return (
      <div className="calendar-day-view">
        {dayEvents.map(event => (
          <div key={event.id} className="day-view-event">
            <div className="event-time">
              {formatTime(event.startTime)}
            </div>
            <div className="event-details">
              <span className="event-summary">{event.summary}</span>
              {event.location && (
                <span className="event-location">
                  <span className="icon">location_on</span>
                  {event.location}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="calendar-tab-content">
      {renderHeader()}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
    </div>
  );
};

export default CalendarTab;
