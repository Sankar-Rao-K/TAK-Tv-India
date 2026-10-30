import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/sitemap.xml')({server:{handlers:{GET:async({request})=>{const {serveFeed}=await import('@/lib/feeds.server');return serveFeed(request,'sitemap');}}}});
