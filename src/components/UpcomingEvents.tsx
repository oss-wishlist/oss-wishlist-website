import { useState, useEffect } from 'react';

interface Event {
  title: string;
  startDate: string;
  endDate: string | null;
  url: string;
  description?: string;
}

interface UpcomingEventsProps {
  basePath: string;
}

export default function UpcomingEvents({ basePath }: UpcomingEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${basePath}api/upcoming-events`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvents(data.events);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [basePath]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">Upcoming Events</h2>
        <div className="text-gray-500 text-center py-4">Loading events...</div>
      </div>
    );
  }

  if (error || events.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-purple-700 mb-4">Upcoming Events</h2>
        <p className="text-gray-600 mb-4">No upcoming events scheduled at the moment.</p>
        <a 
          href={`${basePath}calendar`}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          View calendar →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-purple-700 mb-4">Upcoming Events</h2>
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
            <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
            <div className="text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDate(event.startDate)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTime(event.startDate)}</span>
              </div>
            </div>
            {event.url && (
              <a 
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
              >
                Register
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <a 
          href={`${basePath}calendar`}
          className="text-gray-700 hover:text-gray-900 font-medium inline-flex items-center gap-1"
        >
          View all events
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
