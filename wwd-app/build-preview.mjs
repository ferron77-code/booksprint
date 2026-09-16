#!/usr/bin/env node
/* Builds technician-preview.html: the technician app as one file that
   can be opened from a phone, mailed, or dropped on any static host.

   Source of truth is the technician/ folder. Run this after editing
   anything in it:   node build-preview.mjs                          */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'technician');
const read = f => fs.readFileSync(path.join(src, f), 'utf8');

let html = read('index.html');

html = html.replace('<link rel="stylesheet" href="tech.css">',
  () => '<style>\n' + read('tech.css') + '\n</style>');

// Some browsers refuse localStorage when opened as a file:// URL or in
// private mode. Give the app an in-memory stand-in so it still runs.
const shim = `<script>
(function(){ try { localStorage.setItem('_t','1'); localStorage.removeItem('_t'); }
  catch(e){ const m={}; Object.defineProperty(window,'localStorage',{value:{
    getItem:k=>k in m?m[k]:null, setItem:(k,v)=>{m[k]=String(v)},
    removeItem:k=>{delete m[k]}, clear:()=>{for(const k in m)delete m[k]},
    get length(){return Object.keys(m).length}, key:i=>Object.keys(m)[i]||null }}); } })();
</script>`;

const inline = f => '<script>\n' + read(f).replace(/<\/script/gi, '<\\/script') + '\n</script>';
html = html.replace('<script src="vendor/supabase.js"></script>', () => shim + '\n' + inline('vendor/supabase.js'));
html = html.replace('<script src="config.js"></script>', () => inline('config.js'));
html = html.replace('<script src="tech.js"></script>', () => inline('tech.js'));

if (/<script src=/.test(html) || /<link rel="stylesheet" href="tech/.test(html)) {
  console.error('build-preview: a local reference was not inlined');
  process.exit(1);
}

const out = path.join(here, 'technician-preview.html');
fs.writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (html.length / 1024).toFixed(0) + ' KB');
