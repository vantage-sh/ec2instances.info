"use client";

declare global {
    interface Window {
        _iub?: {
            cs?: {
                api?: {
                    openPreferences?: () => void;
                };
            };
        };
    }
}

export default function PrivacyChoicesLink() {
    return (
        <button
            type="button"
            onClick={() => window._iub?.cs?.api?.openPreferences?.()}
            className="text-purple-brand text-underline hover:text-purple-0"
        >
            Your Privacy Choices
        </button>
    );
}
