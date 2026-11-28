# Prakriti

A WebKit container for GNOME style apps.

## Running the tests

The unit tests are plain GJS, with no dependencies beyond `gjs` itself.
Run them straight from the source tree:

```sh
gjs -m test/run.js
```

Pass a filter to run only the tests whose `suite: name` contains it:

```sh
gjs -m test/run.js launcher/popups
```

Or run them through Meson, which runs them from a copy in the build
directory (as GNOME Builder does inside the Flatpak runtime):

```sh
meson setup build
meson test -C build
```

The output is TAP; `meson test -C build -v` shows it.

### Integration tests

`test/integration` tests the launcher's window and popups with a real
`Adw.Application`, GTK widgets, WebKit views and the injected bridge.
They need a display, so `test/integration/run.sh` runs them in a headless
mutter with a session bus of its own:

```sh
sh test/integration/run.sh gjs -m test/integration/run.js
```

As with the unit tests, a filter can follow `run.js`. `meson test` runs them
as the `integration` suite when `mutter` and `dbus-run-session` are
installed, and skips them otherwise. Leave them out with
`meson test -C build --no-suite integration`, or run only them with
`--suite integration`.

## Running the demo app

`src/main.js` is a small demo app built on the launcher, serving the page in
`src/frontend`. It needs GJS with GTK 4, libadwaita and WebKitGTK 6.0. Run
it from the source tree:

```sh
gjs -m src/main.js
```

Or install it with Meson (the `demo` option, on by default, installs the
demo alongside the library) and run the installed `app` command:

```sh
meson setup build --prefix="$HOME/.local"
meson install -C build
app
```

Configure with `-Ddemo=false` to install only the library.

## Using it in a Flatpak app

Add it to your manifest as a module before your app
(the release notes carry the exact `url` and `sha256`):

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

- the launcher at `/app/share/prakriti/launcher`, which `main.js`
  can import as `file:///app/share/prakriti/launcher/application.js`;
- the frontend lib at `/app/share/prakriti/frontend/lib`. The page is served
  from your frontend directory only, so install a `lib` symlink there
  pointing at it (or copy it in).
