import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'app.blizko.nanny',
    appName: 'Blizko — Подбор нянь',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    plugins: {
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },
        SplashScreen: {
            launchAutoHide: true,
            backgroundColor: '#6C2586',
            androidSplashResourceName: 'splash',
            showSpinner: false,
            launchFadeOutDuration: 300,
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#6C2586',
        },
    },
    ios: {
        contentInset: 'automatic',
        preferredContentMode: 'mobile',
        scheme: 'Blizko',
    },
    android: {
        allowMixedContent: false,
        backgroundColor: '#FAFAF9',
    },
};

export default config;
