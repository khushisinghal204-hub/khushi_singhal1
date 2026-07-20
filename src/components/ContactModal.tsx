import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Humne path ko bhasha-bridge ke hisab se set kiya h

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');

    // UX States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Esc Key Setup & Focus Trap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            modalRef.current?.focus();
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Supabase Pipeline Insert[cite: 1]
            const { error: sbError } = await (supabase
                .from('contacts' as any) as any)
                .insert([{ name, email, message }]);

            if (sbError) throw sbError;

            // Success Sequence[cite: 1]
            setShowToast(true);
            setName('');
            setEmail('');
            setMessage('');

            // Auto-Close Sequence (2.5s delay)[cite: 1]
            setTimeout(() => {
                setShowToast(false);
                onClose();
            }, 2500);

        } catch (err: any) {
            // Friendly Error Mapping[cite: 1]
            if (err.code === '23505') {
                setError("You've already submitted! Check your inbox.");
            } else if (err.code === '42501') {
                setError("Permission denied by server security policy.");
            } else {
                setError(err.message || "Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200">

            {/* Toast Alert Popup[cite: 1] */}
            {showToast && (
                <div role="status" aria-live="polite" className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg border border-emerald-400">
                    <span>✓ Thanks! We'll reply within 24h.</span>
                </div>
            )}

            {/* Main Responsive Canvas Modal Container[cite: 1] */}
            <div
                ref={modalRef}
                tabIndex={-1}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 transition-all transform scale-100 duration-180"
            >
                {/* Header Block[cite: 1] */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Contact us</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Error Messaging State banner[cite: 1] */}
                {error && (
                    <div role="alert" className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm rounded-xl border border-rose-100 dark:border-rose-900/50">
                        {error}
                    </div>
                )}

                {/* Interactive Form Submissions pipeline[cite: 1] */}
                <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">Email *</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-500 dark:text-slate-400">Message *</label>
                        <textarea
                            required
                            rows={4}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                            placeholder="How can we help?"
                        />
                    </div>

                    {/* Action Trigger Buttons Container[cite: 1] */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-3 px-4 rounded-xl shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[44px]"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>SENDING...</span>
                            </>
                        ) : (
                            <span>SEND</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}