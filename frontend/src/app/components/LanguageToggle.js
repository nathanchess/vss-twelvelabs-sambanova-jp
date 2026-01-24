'use client';

import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
    const { language, toggleLanguage } = useLanguage();

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all duration-200 ease-in-out hover:shadow-sm group"
            aria-label={`Switch to ${language === 'en' ? 'Japanese' : 'English'}`}
        >
            {/* Flag/Language indicator */}
            <div className="relative flex items-center">
                <span
                    className={`text-sm font-medium transition-all duration-200 ${language === 'en'
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                >
                    EN
                </span>

                {/* Toggle Switch */}
                <div className="mx-2 relative w-10 h-5 bg-gray-200 rounded-full transition-colors duration-200">
                    <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ease-in-out ${language === 'jp'
                                ? 'left-5 bg-gradient-to-r from-red-500 to-red-400'
                                : 'left-0.5 bg-gradient-to-r from-blue-500 to-blue-400'
                            }`}
                    />
                </div>

                <span
                    className={`text-sm font-medium transition-all duration-200 ${language === 'jp'
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                >
                    日本語
                </span>
            </div>
        </button>
    );
}
