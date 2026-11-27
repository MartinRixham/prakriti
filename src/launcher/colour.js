export function rgbaToHex({ red, green, blue }) {
    return `#${[red, green, blue]
        .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0'))
        .join('')}`;
}
