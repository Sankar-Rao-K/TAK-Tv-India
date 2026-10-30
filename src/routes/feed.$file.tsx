import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/feed/$file')({server:{handlers:{GET:async({request,params})=>{const {serveFeed}=await import('@/lib/feeds.server');if(!/^(en|hi|te)\.xml$/.test(params.file))return new Response('Not found',{status:404});return serveFeed(request,'rss',params.file.slice(0,-4));}}}});
