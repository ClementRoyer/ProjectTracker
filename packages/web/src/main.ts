import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './theme.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { createApi, pageToken } from './lib/api';
import { Tracker } from './lib/tracker.svelte';

const target = document.getElementById('app');
if (target) mount(App, { target, props: { tracker: new Tracker(createApi(pageToken())) } });
