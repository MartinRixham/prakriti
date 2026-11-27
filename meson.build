project('prakriti',
  version: '0.1.0',
  meson_version: '>= 1.0',
)

gjs = find_program('gjs')

libdir = get_option('datadir') / meson.project_name()
install_subdir('src/launcher', install_dir: libdir)
install_subdir('src/frontend/lib', install_dir: libdir / 'frontend')

if get_option('demo')

app_id = 'org.example.App'
appdir = get_option('prefix') / get_option('datadir') / 'app'

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

endif

test_stage = custom_target('test-stage',
  output: 'test-stage.stamp',
  command: ['sh', '-c',
    'rm -rf "$1" && mkdir -p "$1" && cp -R "$2/src" "$2/test" "$1" && touch "$3"',
    'sh', meson.current_build_dir() / 'test-stage',
    meson.current_source_dir(), '@OUTPUT@'],
  build_by_default: true,
  build_always_stale: true,
)

test('unit', gjs,
  args: ['-m', meson.current_build_dir() / 'test-stage/test/run.js'],
  depends: test_stage,
  protocol: 'tap',
  workdir: meson.current_build_dir(),
)
