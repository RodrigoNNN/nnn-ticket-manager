import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUser as apiUpdateUser } from '../utils/api-service';
import ChangePasswordModal from '../components/common/ChangePasswordModal';
import { User, Lock, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    whatsapp_number: user?.whatsapp_number || '',
  });
  const [saving, setSaving] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await apiUpdateUser(user.id, {
        name: form.name,
        whatsapp_number: form.whatsapp_number,
      });
      updateUser({ name: form.name, whatsapp_number: form.whatsapp_number });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const deptColor = {
    Management: 'bg-blue-500',
    Marketing: 'bg-green-500',
    IT: 'bg-purple-500',
    Accounting: 'bg-amber-500',
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Profile</h1>

      <div className="card p-6 mb-6">
        {/* Avatar + Role */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className={`w-14 h-14 rounded-full ${deptColor[user?.department] || 'bg-gray-400'} flex items-center justify-center text-white font-bold text-xl`}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
                {user?.department}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              value={form.email}
              disabled
              className="input-field opacity-60 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 mt-1">Contact your admin to change your email</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp Number</label>
            <input
              value={form.whatsapp_number}
              onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              className="input-field"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm w-full justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password section */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Password</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Change your login password</p>
          </div>
          <button
            onClick={() => setShowChangePw(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Lock className="w-4 h-4" /> Change Password
          </button>
        </div>
      </div>

      {showChangePw && (
        <ChangePasswordModal open onClose={() => setShowChangePw(false)} />
      )}
    </div>
  );
}
