# Prakriti

A webkit container for GNOME style apps.

## Using it in a Flatpak app

Each `v*` tag publishes a release tarball. Add it to your manifest as a
module before your app (the release notes carry the exact `url` and
`sha256`):

```json
{
  "name": "prakriti",
  "buildsystem": "meson",
  "config-opts": ["-Ddemo=false"],
  "sources": [
    {
      "type": "archive",
      "url": "https://github.com/OWNER/prakriti/releases/download/vX.Y.Z/prakriti-X.Y.Z.tar.xz",
      "sha256": "..."
    }
  ]
}
```

That installs:

- the launcher at `/app/share/prakriti/launcher`, which your `main.js`
  imports as `file:///app/share/prakriti/launcher/application.js`;
- the frontend lib at `/app/share/prakriti/frontend/lib`. The page is served
  from your frontend directory only, so install a `lib` symlink there
  pointing at it (or copy it in).
