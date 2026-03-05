import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './index.html',
        './App.tsx',
        './index.tsx',
        './components/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                milk: '#F9F6F1',
                stone: { 850: '#292524' },
                sky: { 150: '#E0F2FE' },
                amber: { 350: '#FCD34D' },
            },
            fontFamily: {
                sans: [
                    'Quicksand',
                    'system-ui',
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'Segoe UI',
                    'Roboto',
                    'Helvetica Neue',
                    'Arial',
                    'sans-serif',
                ],
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'pop-in': 'popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                popIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9) translateY(20px)' },
                    '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
