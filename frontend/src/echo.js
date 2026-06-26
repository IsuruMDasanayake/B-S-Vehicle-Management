import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'bs_reverb_key',
    wsHost: import.meta.env.VITE_REVERB_HOST && import.meta.env.VITE_REVERB_HOST !== 'localhost' ? import.meta.env.VITE_REVERB_HOST : window.location.hostname,
    wsPort: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
    wssPort: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
    forceTLS: window.location.protocol === 'https:',
    enabledTransports: ['ws', 'wss'],
});
