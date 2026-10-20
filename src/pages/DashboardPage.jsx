import React, { useEffect, useState } from 'react';
import { ArrowRight, LogOut, Loader2, Play, Plus, Sparkles, Sword, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { campaignApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const statusLabels = {
    pending: 'À préparer',
    active: 'En cours',
    completed: 'Terminée'
};

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [campaigns, setCampaigns] = useState([]);
    const [newCampName, setNewCampName] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [pageError, setPageError] = useState('');
    const [createError, setCreateError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        campaignApi.list()
            .then((data) => {
                if (!cancelled) setCampaigns(Array.isArray(data) ? data : []);
            })
            .catch((error) => {
                if (!cancelled) setPageError(error.message || 'Impossible de charger vos campagnes.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    const handleCreate = async (event) => {
        event.preventDefault();
        const name = newCampName.trim();
        if (!name || creating) return;

        setCreating(true);
        setCreateError('');
        try {
            const newCampaign = await campaignApi.create(name);
            setCampaigns((currentCampaigns) => [newCampaign, ...currentCampaigns]);
            setNewCampName('');
        } catch (error) {
            setCreateError(error.message || 'Impossible de créer la campagne.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950">
            <header className="border-b border-zinc-800 bg-zinc-950/90">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold">Aether Table</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden text-sm text-zinc-400 sm:inline">{user?.email}</span>
                        <button
                            type="button"
                            onClick={logout}
                            aria-label="Se déconnecter"
                            title="Se déconnecter"
                            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
                <section className="mb-10 overflow-hidden rounded-2xl border border-indigo-900/60 bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-900 p-6 md:p-10">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">Votre espace de jeu</p>
                        <h1 className="mb-3 text-3xl font-bold md:text-4xl">Bienvenue dans l’Aether</h1>
                        <p className="text-sm leading-6 text-zinc-300 md:text-base">
                            Retrouvez vos aventures, préparez une campagne ou reprenez une partie là où vous l’avez laissée.
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300">
                            <Users className="h-4 w-4 text-indigo-300" />
                            {campaigns.length} campagne{campaigns.length === 1 ? '' : 's'}
                        </div>
                    </div>
                </section>

                <section aria-labelledby="campaigns-heading">
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 id="campaigns-heading" className="text-2xl font-bold">Mes campagnes</h2>
                            <p className="mt-1 text-sm text-zinc-500">Choisissez une aventure pour ouvrir son menu de jeu.</p>
                        </div>
                        <form onSubmit={handleCreate} className="flex w-full gap-2 md:w-auto">
                            <label className="sr-only" htmlFor="new-campaign-name">Nom de la nouvelle campagne</label>
                            <input
                                id="new-campaign-name"
                                value={newCampName}
                                onChange={(event) => setNewCampName(event.target.value)}
                                placeholder="Nom de la campagne..."
                                maxLength={255}
                                required
                                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 outline-none transition focus:border-indigo-500 md:w-64"
                            />
                            <button
                                type="submit"
                                disabled={creating || !newCampName.trim()}
                                className="flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                                <span className="hidden sm:inline">{creating ? 'Création...' : 'Créer'}</span>
                            </button>
                        </form>
                    </div>

                    {createError && (
                        <p role="alert" className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                            {createError}
                        </p>
                    )}
                    {pageError && (
                        <p role="alert" className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                            {pageError}
                        </p>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 py-14 text-zinc-400">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Chargement des campagnes...
                        </div>
                    ) : !pageError && campaigns.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-6 py-14 text-center">
                            <Sword className="mx-auto mb-4 h-9 w-9 text-zinc-600" />
                            <h3 className="text-lg font-semibold">Aucune campagne pour le moment</h3>
                            <p className="mt-2 text-sm text-zinc-500">Créez votre première aventure avec le formulaire ci-dessus.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {campaigns.map((campaign) => (
                                <article
                                    key={campaign.id}
                                    className="flex min-h-56 flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-indigo-500/60"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-indigo-300">
                                            <Sword className="h-5 w-5" />
                                        </div>
                                        <span className={`rounded border px-2 py-1 text-xs ${
                                            campaign.status === 'active'
                                                ? 'border-green-800 bg-green-950/40 text-green-300'
                                                : campaign.status === 'completed'
                                                    ? 'border-zinc-700 text-zinc-400'
                                                    : 'border-indigo-900 text-indigo-300'
                                        }`}>
                                            {statusLabels[campaign.status] || 'À préparer'}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold">{campaign.name}</h3>
                                    <p className="mt-1 text-sm text-zinc-500">
                                        {campaign.system || 'D&D 5e'}
                                        {campaign.created_at && ` · Créée le ${new Date(campaign.created_at).toLocaleDateString()}`}
                                    </p>
                                    {campaign.description && (
                                        <p className="mt-3 line-clamp-2 text-sm text-zinc-400">{campaign.description}</p>
                                    )}

                                    <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-800 pt-4">
                                        {campaign.is_owner ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                                                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                                            >
                                                <Sword className="h-4 w-4" />
                                                Préparer
                                            </button>
                                        ) : <span />}
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/campaigns/${campaign.id}/play`)}
                                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                                        >
                                            <Play className="h-4 w-4" />
                                            Ouvrir
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
