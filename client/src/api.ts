import axios from 'axios';

const api = axios.create({
  baseURL: 'https://gold-turtles-joke.loca.lt',
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

export default api;