'use client';

import { useState } from 'react';
import { useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Loader2, ChevronRight, TreePine } from 'lucide-react';

export default function SelectOrgForm() {
  const router = useRouter();
  const { isLoaded, userMemberships, createOrganization, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [loadingOrgId, setLoadingOrgId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (orgId: string) => {
    if (!setActive) return;
    setLoadingOrgId(orgId);
    setError('');
    try {
      await setActive({ organization: orgId });
      router.push('/dashboard');
    } catch {
      setError('Could not select organization. Please try again.');
      setLoadingOrgId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !createOrganization || !setActive) return;

    setCreating(true);
    setError('');
    try {
      const org = await createOrganization({ name: orgName.trim() });
      await setActive({ organization: org.id });
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? 'Could not create organization.';
      setError(msg);
      setCreating(false);
    }
  };

  const orgs = userMemberships?.data ?? [];
  const busy = !!loadingOrgId || creating;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-primary-100 p-8">
      {/* Header */}
      <div className="text-center mb-7">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <TreePine className="w-6 h-6 text-primary-600" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Select your organization</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose a workspace to continue, or create a new one.
        </p>
      </div>

      {!isLoaded ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Existing orgs */}
          {orgs.length > 0 && (
            <div className="space-y-2">
              {orgs.map((mem) => {
                const org = mem.organization;
                const isSelectingThis = loadingOrgId === org.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelect(org.id)}
                    disabled={busy}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group disabled:opacity-60 disabled:cursor-not-allowed text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {org.imageUrl ? (
                        <img
                          src={org.imageUrl}
                          alt={org.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{org.name}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {String(mem.role).replace('org:', '')}
                      </p>
                    </div>
                    {isSelectingThis ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition-colors flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          {orgs.length > 0 && (
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}

          {/* Create org */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              disabled={busy}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-primary-100 flex items-center justify-center flex-shrink-0 transition-colors">
                <Plus className="w-4 h-4 text-gray-500 group-hover:text-primary-600 transition-colors" />
              </div>
              <span className="text-sm font-medium text-gray-600 group-hover:text-primary-700 transition-colors">
                Create a new organization
              </span>
            </button>
          ) : (
            <form onSubmit={handleCreate} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Organization name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Forest Management"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-colors placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setOrgName('');
                    setError('');
                  }}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !orgName.trim()}
                  className="flex-1 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
