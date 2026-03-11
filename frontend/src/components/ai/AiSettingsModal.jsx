import { useState, useEffect } from 'react';
import { useAi } from '../../context/AiContext';
import { testApiKey } from '../../utils/ai-service';
import { X, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI', description: 'ChatGPT models', color: 'bg-green-500' },
  { id: 'anthropic', label: 'Anthropic', description: 'Claude models', color: 'bg-orange-500' },
  { id: 'gemini', label: 'Google Gemini', description: 'Gemini models', color: 'bg-blue-500' },
];

const MODELS = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
    { id: 'gpt-4o', label: 'GPT-4o (Best Quality)' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Balanced)' },
    { id: 'claude-haiku-4-20250414', label: 'Claude Haiku 4 (Fast & Cheap)' },
  ],
  gemini: [
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Fast)' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (Cheapest)' },
  ],
};

export default function AiSettingsModal() {
  const { isSettingsOpen, closeSettings, settings, saveSettings, refreshSettings } = useAi();
  const [provider, setProvider] = useState(settings?.provider || 'openai');
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');
  const [model, setModel] = useState(settings?.model || 'gpt-4o-mini');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, error?: string }

  // Sync form state when settings change (e.g., user switch)
  useEffect(() => {
    if (isSettingsOpen) {
      const current = refreshSettings();
      setProvider(current?.provider || 'openai');
      setApiKey(current?.apiKey || '');
      setModel(current?.model || MODELS[current?.provider || 'openai'][0].id);
      setTestResult(null);
    }
  }, [isSettingsOpen, refreshSettings]);

  // When provider changes, reset model to first option
  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    setModel(MODELS[newProvider][0].id);
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testApiKey({ provider, apiKey, model });
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    saveSettings({ provider, apiKey, model });
    closeSettings();
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Assistant Settings</h2>
          <button onClick={closeSettings} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">AI Provider</label>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`px-3 py-2.5 rounded-lg border-2 text-center transition-all ${
                  provider === p.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${p.color} mx-auto mb-1`} />
                <span className={`text-xs font-semibold block ${
                  provider === p.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {MODELS[provider].map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* API Key Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
              placeholder={provider === 'openai' ? 'sk-...' : provider === 'anthropic' ? 'sk-ant-...' : 'AI...'}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
            Your key is stored only in your browser. It is never saved on our servers.
          </p>
        </div>

        {/* Test Connection */}
        <div className="mb-5">
          <button
            onClick={handleTest}
            disabled={!apiKey || testing}
            className="w-full px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <div className={`mt-2 flex items-center gap-2 text-xs ${testResult.success ? 'text-green-600' : 'text-red-500'}`}>
              {testResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {testResult.success ? 'Connection successful!' : testResult.error || 'Connection failed'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={closeSettings}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
