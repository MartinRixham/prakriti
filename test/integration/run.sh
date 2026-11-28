#!/bin/sh
# Runs a command in a headless mutter of its own, on a session bus of its
# own that starts no services (no portals, gvfs or accessibility bus):
#   run.sh gjs -m test/integration/run.js [filter]
# mutter exits when the command does, and fails if it fails.
set -eu

# A short path: a Wayland socket's path must fit in 108 bytes.
runtime=$(mktemp -d /tmp/prakriti-test.XXXXXX)
trap 'rm -rf "$runtime"' EXIT

cat > "$runtime/bus.conf" <<CONF
<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-Bus Bus Configuration 1.0//EN"
 "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <type>session</type>
  <listen>unix:dir=$runtime</listen>
  <auth>EXTERNAL</auth>
  <policy context="default">
    <allow send_destination="*" eavesdrop="true"/>
    <allow eavesdrop="true"/>
    <allow own="*"/>
  </policy>
</busconfig>
CONF

export XDG_RUNTIME_DIR="$runtime"
export GTK_A11Y=none
export GIO_USE_VFS=local

dbus-run-session --config-file="$runtime/bus.conf" -- \
    mutter --headless --no-x11 --virtual-monitor 1024x768 --wayland-display=wayland-test -- "$@"
