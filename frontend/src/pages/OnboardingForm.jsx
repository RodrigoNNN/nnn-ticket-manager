import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchOnboardingFormBySlug, fetchOnboardingForms, createSpa, createTicket } from '../utils/api-service';
import { TIER_DEFINITIONS } from '../utils/constants';
import DynamicFieldRenderer from '../components/common/DynamicFieldRenderer';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function OnboardingForm() {
  const { slug } = useParams();

  const [form, setForm] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (slug) {
          setForm(await fetchOnboardingFormBySlug(slug));
        } else {
          const forms = await fetchOnboardingForms();
          setForm(forms[0] || null);
        }
      } catch {}
      setPageLoading(false);
    })();
  }, [slug]);

  if (pageLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Form Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">
            This onboarding form does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const fields = form.fields || [];

  const updateValue = (fieldId, val) => {
    setValues(prev => ({ ...prev, [fieldId]: val }));
    if (errors[fieldId]) setErrors(prev => ({ ...prev, [fieldId]: null }));
  };

  const validate = () => {
    const errs = {};
    for (const field of fields) {
      if (field.required) {
        const val = values[field.id];
        if (val === undefined || val === null || val === '' || val === false) {
          errs[field.id] = `${field.label} is required`;
        }
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const tierField = fields.find(f => f.type === 'tier_select');
      const tierValue = tierField ? values[tierField.id] : null;

      // Extract spa name: look for fields with "name", "spa", or "business" in the label
      const nameField = fields.find(f =>
        /\b(spa|business|company|clinic|name)\b/i.test(f.label) && f.type === 'text'
      );
      const spaName = nameField ? (values[nameField.id] || '').trim() : '';

      const spa = await createSpa({
        name: spaName || 'New Spa',
        onboarding_data: { ...values },
        onboarded_via: 'form',
        tier: tierValue || null,
      });

      await createTicket({
        ticket_type: form.ticket_type || 'New Spa',
        spa_id: spa.id,
        treatment_name: 'Full Service Launch',
        priority: 'High',
        target_audience: 'Both',
        due_date: '',
        additional_info: `Onboarded via "${form.name}" form on ${new Date().toLocaleDateString()}${tierValue ? `. Tier ${tierValue}: ${TIER_DEFINITIONS[tierValue]?.subtitle}` : ''}`,
      }, 'system');

      setSubmitted(true);
    } catch {}
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your onboarding information has been submitted successfully. Our team will be in touch shortly to get everything set up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl mb-4">
            N
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{form.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please fill out the form below to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          {fields.map(field => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}{field.required ? ' *' : ''}
              </label>
              <DynamicFieldRenderer
                field={field}
                value={values[field.id] ?? ''}
                onChange={val => updateValue(field.id, val)}
              />
              {errors[field.id] && (
                <p className="text-xs text-red-500 mt-1">{errors[field.id]}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-6">
          Powered by NNN Ticket Manager
        </p>
      </div>
    </div>
  );
}
