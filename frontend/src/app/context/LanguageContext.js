'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState('en');

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('app-language');
        if (saved === 'jp' || saved === 'en') {
            setLanguage(saved);
        }
    }, []);

    // Save to localStorage when changed
    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'jp' : 'en';
        setLanguage(newLang);
        localStorage.setItem('app-language', newLang);
    };

    const setLang = (lang) => {
        if (lang === 'jp' || lang === 'en') {
            setLanguage(lang);
            localStorage.setItem('app-language', lang);
        }
    };

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage: setLang }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
