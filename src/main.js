import { initCursorScrub } from './cursor-scrub.js';
import { initNavLogo } from './nav-logo.js';
import { initHeroStickers } from './hero-stickers.js';
import './hero-stickers.css';

initCursorScrub(document.querySelector('.hero__video'));
initNavLogo(document.querySelector('.nav__logo'));
initHeroStickers(document.querySelector('.hero'));
