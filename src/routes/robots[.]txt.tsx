import {createFileRoute} from '@tanstack/react-router';
// Generated so the Sitemap lines carry the real, absolute website address (Settings → Website address).
export const Route=createFileRoute('/robots.txt')({server:{handlers:{GET:async({request})=>{const {serveFeed}=await import('@/lib/feeds.server');return serveFeed(request,'robots');}}}});
