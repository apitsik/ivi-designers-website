import { initSmoothScroll } from './smooth-scroll.js';
import { initCursorScrub } from './cursor-scrub.js';
import { initNavLogo } from './nav-logo.js';
import { initHeroStickers } from './hero-stickers.js';
import { initShowreels } from './showreels.js';
import { initVideoModal } from './video-modal.js';
import './hero-stickers.css';
import './showreels.css';

initSmoothScroll();
initCursorScrub(document.querySelector('.hero__video'));
initNavLogo(document.querySelector('.nav__logo'));
initHeroStickers(document.querySelector('.hero'));
initShowreels(document.querySelector('.showreels'));
initVideoModal(document.querySelector('.video-modal'), document.querySelectorAll('.showreel[data-vimeo]'));
