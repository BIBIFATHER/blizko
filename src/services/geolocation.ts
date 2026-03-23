import { Language } from '@/core/types';

export interface GeolocationResult {
    city: string;
    district: string;
    success: boolean;
    error?: string;
}

export const detectUserLocation = async (lang: Language): Promise<GeolocationResult> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({
                city: '',
                district: '',
                success: false,
                error: lang === 'ru' ? 'Геолокация не поддерживается вашим браузером' : 'Geolocation is not supported by your browser'
            });
            return;
        }

        // Using slightly more relaxed settings for better success rate
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    // Use OpenStreetMap Nominatim for reverse geocoding
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=${lang}`;
                    const r = await fetch(url, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'BlizkoApp/1.0' // Best practice for Nominatim
                        }
                    });

                    if (!r.ok) throw new Error('Geocoding service error');

                    const data = await r.json();
                    const city = data?.address?.city || data?.address?.town || data?.address?.village || '';
                    const district = data?.address?.suburb || data?.address?.city_district || data?.address?.neighbourhood || '';

                    resolve({
                        city,
                        district,
                        success: !!(city || district),
                        error: !(city || district) ? (lang === 'ru' ? 'Не удалось определить город автоматически' : 'Could not detect city automatically') : undefined
                    });
                } catch (err) {
                    console.error('Reverse geocoding error:', err);
                    resolve({
                        city: '',
                        district: '',
                        success: false,
                        error: lang === 'ru' ? 'Ошибка при получении адреса' : 'Error retrieving address'
                    });
                }
            },
            (err) => {
                console.warn('Geolocation error:', err);
                let errorMsg = lang === 'ru' ? 'Ошибка геолокации' : 'Geolocation error';

                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMsg = lang === 'ru' ? 'Доступ к геолокации запрещен. Проверьте настройки браузера или системы.' : 'Location access denied. Please check your browser or system settings.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMsg = lang === 'ru' ? 'Информация о местоположении недоступна.' : 'Location information is unavailable.';
                        break;
                    case err.TIMEOUT:
                        errorMsg = lang === 'ru' ? 'Превышено время ожидания геолокации.' : 'Location request timed out.';
                        break;
                }

                resolve({
                    city: '',
                    district: '',
                    success: false,
                    error: errorMsg
                });
            },
            {
                enableHighAccuracy: false, // More reliable on desktops/laptops
                timeout: 15000,
                maximumAge: 60000
            }
        );
    });
};
