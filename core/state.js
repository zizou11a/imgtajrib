'use strict';
const $ = id => document.getElementById(id);
let files = [];
let filesC = [];
let blobsC = [];
let urlsC = [];
let currentLang = 'en';
const Store = {
get(k) { try { return localStorage.getItem(k); } catch { return null; } },
set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};