import {describe,it,expect} from 'vitest';
import {validSlug,youtubeId,validateStory,isPublic,newsDate} from './news';
import {cleanStory} from './news-sanitize';
describe('Newsroom rules',()=>{
 it('accepts only 3–80 lowercase slug characters',()=>{expect(validSlug('ab')).toBe(false);expect(validSlug('abc')).toBe(true);expect(validSlug('a'.repeat(80))).toBe(true);expect(validSlug('a'.repeat(81))).toBe(false);expect(validSlug('News-title')).toBe(false);});
 it('requires 40 story characters unless a video exists',()=>{const a={title:'Headline',category_id:'india',body_html:'x'.repeat(39),youtube_id:'',cover_path:'',cover_alt:'',slug:'test-story'};expect(validateStory(a)).toContain('Write at least 40 characters or add a video.');expect(validateStory({...a,body_html:'x'.repeat(40)})).toEqual([]);expect(validateStory({...a,youtube_id:'dQw4w9WgXcQ'})).toEqual([]);});
 it('requires a cover caption',()=>{expect(validateStory({title:'Headline',category_id:'india',body_html:'x'.repeat(40),youtube_id:'',cover_path:'a.webp',cover_alt:'',slug:'test-story'})).toContain('Add a cover photo caption.');});
 it('hides drafts and future schedules, reveals schedules at publish time',()=>{const at=Date.parse('2026-10-20T05:00:00Z');expect(isPublic({status:'draft',published_at:null,publish_at:null},at)).toBe(false);expect(isPublic({status:'scheduled',published_at:null,publish_at:'2026-10-20T05:01:00Z'},at)).toBe(false);expect(isPublic({status:'scheduled',published_at:null,publish_at:'2026-10-20T05:00:00Z'},at)).toBe(true);});
 it('recognizes YouTube formats and rejects lookalike hosts',()=>{expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');expect(youtubeId('https://evil.example/watch?v=dQw4w9WgXcQ')).toBe(null);});
 it('removes scripts, event handlers, javascript links and promotes h1 to h2',()=>{const s=cleanStory('<h1>Title</h1><script>alert(1)</script><p onclick="alert(1)">Safe</p><a href="javascript:alert(1)">link</a>');expect(s).toContain('<h2>Title</h2>');expect(s).not.toContain('script');expect(s).not.toContain('onclick');expect(s).not.toContain('javascript:');});
 it('formats dates in IST twelve-hour format',()=>{expect(newsDate('2026-10-20T02:05:00Z')).toBe('20 Oct 2026, 7:35 AM IST');});
});
