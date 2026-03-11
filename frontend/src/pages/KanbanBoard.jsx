import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchTickets } from '../utils/api-service';
import { TICKET_TYPE_COLORS } from '../utils/constants';
import DepartmentDots from '../components/common/DepartmentDots';
import PriorityBadge from '../components/common/PriorityBadge';
import ProgressBar from '../components/common/ProgressBar';
import { Search, PlusCircle, Loader2 } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const COLUMNS = [
  { key: 'Open', label: 'Open', color: 'border-gray-400' },
  { key: 'In Progress', label: 'In Progress', color: 'border-yellow-400' },
  { key: 'Done', label: 'Done', color: 'border-green-500' },
];

export default function KanbanBoard() {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refreshTickets = useCallback(() => {
    setLoading(true);
    fetchTickets()
      .then(data => { setTickets(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { refreshTickets(); }, [refreshTickets]);

  if (loading && tickets.length === 0) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  const filteredTickets = tickets.filter(t => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !t.spa?.name?.toLowerCase().includes(s) &&
        !t.ticket_type?.toLowerCase().includes(s) &&
        !t.treatment_name?.toLowerCase().includes(s)
      ) return false;
    }
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const getColumnTickets = (status) =>
    filteredTickets
      .filter(t => t.status === status)
      .sort((a, b) => {
        const po = { Immediate: 0, High: 1, Medium: 2 };
        return (po[a.priority] ?? 3) - (po[b.priority] ?? 3);
      });

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tickets</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 w-56"
            />
          </div>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-field py-1.5 w-36">
            <option value="">All Priorities</option>
            <option value="Immediate">Immediate</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
          <button onClick={() => navigate('/create')} className="btn-primary flex items-center gap-2 py-1.5">
            <PlusCircle className="w-4 h-4" /> New Ticket
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {COLUMNS.map(col => {
          const colTickets = getColumnTickets(col.key);
          return (
            <div key={col.key} className="flex flex-col min-h-0">
              <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{col.label}</h2>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium px-2 py-0.5 rounded-full">{colTickets.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
                {colTickets.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No tickets</p>}
                {colTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} onClick={() => navigate(`/tickets/${ticket.id}`)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketCard({ ticket, onClick }) {
  const typeColor = TICKET_TYPE_COLORS[ticket.ticket_type] || '#6B7280';
  const dueDateStr = ticket.due_date ? format(new Date(ticket.due_date + 'T12:00:00'), 'MMM d') : null;
  const overdue = ticket.due_date && isPast(new Date(ticket.due_date + 'T23:59:59')) && ticket.status !== 'Done';
  const dueToday = ticket.due_date && isToday(new Date(ticket.due_date + 'T12:00:00'));

  return (
    <div onClick={onClick} className="card p-4 cursor-pointer hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: typeColor }}>{ticket.ticket_type}</span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      {ticket.spa ? (
        <Link to={`/spas/${ticket.spa_id}`} onClick={e => e.stopPropagation()} className="font-semibold text-gray-900 dark:text-white text-sm mb-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block">{ticket.spa.name}</Link>
      ) : (
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">No Spa</h3>
      )}
      {ticket.treatment_name && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{ticket.treatment_name}</p>}
      <div className="flex items-center justify-between mb-2">
        {dueDateStr && (
          <span className={`text-xs font-medium ${overdue ? 'text-red-500' : dueToday ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {overdue ? 'Overdue: ' : dueToday ? 'Due today: ' : 'Due: '}{dueDateStr}
          </span>
        )}
        <DepartmentDots departmentStatus={ticket.departmentStatus} />
      </div>
      <div className="flex items-center gap-2">
        <ProgressBar progress={ticket.progress} />
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{ticket.progress}%</span>
      </div>
    </div>
  );
}
