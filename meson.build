project('app',
  version: '0.1.0',
  meson_version: '>= 1.0',
)

app_id = 'org.example.App'
appdir = get_option('prefix') / get_option('datadir') / meson.project_name()

gjs = find_program('gjs')

# The app is plain GJS: main.js, the launcher beside it and the page.
install_data('src/main.js', install_dir: appdir)
install_subdir('src/launcher', install_dir: appdir)
install_subdir('src/frontend', install_dir: appdir)

wrapper = configure_file(
  input: 'data/app.in',
  output: 'app-wrapper',
  configuration: { 'gjs': gjs.full_path(), 'appdir': appdir },
)
install_data(wrapper,
  rename: 'app',
  install_dir: get_option('bindir'),
  install_mode: 'rwxr-xr-x',
)

install_data('data' / app_id + '.desktop',
  install_dir: get_option('datadir') / 'applications',
)

foreach size : ['128', '256', '512']
  install_data('data/icons' / app_id + '-' + size + '.png',
    rename: app_id + '.png',
    install_dir: get_option('datadir') / 'icons/hicolor' / size + 'x' + size / 'apps',
  )
endforeach

# Every unit test, frontend and launcher, under gjs. No display needed:
# nothing they load uses GTK or WebKit.
test('unit', gjs,
  args: ['-m', files('test/run.js')],
  protocol: 'tap',
  workdir: meson.current_build_dir(),
)
