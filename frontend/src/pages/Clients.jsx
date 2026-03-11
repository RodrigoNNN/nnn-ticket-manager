import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchSpas, fetchTickets } from '../utils/api-service';
import { TIER_DEFINITIONS } from '../utils/constants';
import SpaTeamBadges from '../components/spa/SpaTeamBadges';
import { Building2, Search, MapPin, Ticket, Loader2 } from 'lucide-react';

export default function Clients() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { allUsers } = useAuth();
  const [allSpas, setAllSpas] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSpas(), fetchTickets()])
      .then(([s, t]) => { setAllSpas(s); setTickets(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading && allSpas.length === 0) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  const spas = allSpas
    .filter(s => {
      const q = search.toLowerCase();
      if (!q) return true;
      if (s.name.toLowerCase().includes(q)) return true;
      if ((s.location || '').toLowerCase().includes(q)) return true;
      const teamNames = Object.values(s.assigned_team || {}).flat()
        .map(uid => allUsers.find(u => u.id === uid)?.name?.toLowerCase() || '');
      if (teamNames.some(n => n.includes(q))) return true;
      return false;
    })
    .map(spa => {
      const spaTickets = tickets.filter(t => t.spa_id === spa.id);
      return {
        ...spa,
        ticketCount: spaTickets.length,
        openCount: spaTickets.filter(t => t.status === 'Open').length,
        inProgressCount: spaTickets.filter(t => t.status === 'In Progress').length,
        doneCount: spaTickets.filter(t => t.status === 'Done').length,
      };
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{allSpas.length} spas</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Search by name, location, or team member..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {spas.map(spa => (
          <div
            key={spa.id}
            onClick={() => navigate(`/spas/${spa.id}`)}
            className="card p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{spa.name}</h3>
                  {spa.location && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {spa.location}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{spa.country}</span>
                {spa.tier && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TIER_DEFINITIONS[spa.tier]?.color || ''}`}>
                    T{spa.tier}
                  </span>
                )}
              </div>
            </div>

            {Object.values(spa.assigned_team || {}).flat().length > 0 && (
              <div className="py-2">
                <SpaTeamBadges assignedTeam={spa.assigned_team} compact maxShow={5} />
              </div>
            )}

            <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{spa.ticketCount} tickets</span>
              </div>
              {spa.openCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{spa.openCount} open</span>}
              {spa.inProgressCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{spa.inProgressCount} active</span>}
              {spa.doneCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{spa.doneCount} done</span>}
            </div>
          </div>
        ))}
      </div>

      {spas.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No clients found</p>
        </div>
      )}
    </div>
  );
}
