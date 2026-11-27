const handler = window.webkit.messageHandlers.appPopup;
const { data = {} } = window.__appPopup;

const root = document.documentElement;
const theme = data.dark ? 'dark' : 'light';
root.style.colorScheme = theme;
root.dataset.theme = theme;
if (data.accent) root.style.setProperty('--accent-bg', data.accent);

const popover = document.querySelector('.popover');
const contents = document.querySelector('.popover-contents');

(data.sections ?? []).forEach((section, s) => {
    const group = document.createElement('div');
    group.className = 'menu-section';

    section.forEach((label, i) => {
        const item = document.createElement('button');
        item.className = 'model-button';
        item.setAttribute('role', 'menuitem');
        item.textContent = label;
        item.addEventListener('click', () => handler.postMessage({ type: 'activate', value: [s, i] }));
        item.addEventListener('mousemove', () => item.focus({ focusVisible: false }));
        group.append(item);
    });

    contents.append(group);
});

const items = () => [...contents.querySelectorAll('.model-button')];

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        event.preventDefault();
        handler.postMessage({ type: 'close' });
        return;
    }

    const all = items();
    const index = all.indexOf(document.activeElement);
    let next = null;

    switch (event.key) {
        case 'ArrowDown': next = index < 0 ? 0 : (index + 1) % all.length; break;
        case 'ArrowUp': next = index < 0 ? all.length - 1 : (index - 1 + all.length) % all.length; break;
        case 'Home': next = 0; break;
        case 'End': next = all.length - 1; break;
    }

    if (next !== null && all.length) {
        event.preventDefault();
        all[next].focus();
    }
});

// The popover is still hidden while this runs, and hidden pages get no
// animation frames: measure straight away, once the font is in.
await document.fonts.ready;

const box = popover.getBoundingClientRect();

handler.postMessage({
    type: 'size',
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
});
