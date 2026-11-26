import Gio from 'gi://Gio';

Gio._promisify(Gio.File.prototype, 'load_contents_async');

export const ICON_DIR = '/usr/share/icons/Adwaita/symbolic';

// The `icon` api: ({ file }) → the SVG text of a symbolic icon below `dir`,
// without the fill, width and height attributes so the page can style it.
export function iconApi(dir = ICON_DIR) {
    return async ({ file }) => {
        if (typeof file !== 'string' || file.split('/').includes('..')) {
            throw new Error(`Bad icon path: ${file}`);
        }

        const [bytes] = await Gio.File.new_for_path(`${dir}/${file}`).load_contents_async(null);
        const svg = new TextDecoder().decode(bytes);

        return svg.replace(/\s(fill|width|height)="[^"]*"/g, '');
    };
}
