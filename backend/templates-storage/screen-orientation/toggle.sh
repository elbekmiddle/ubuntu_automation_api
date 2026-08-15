#!/bin/bash
MONITOR="eDP-1"
STATE_FILE="/tmp/screenctl-orientation-${MONITOR}"

[ ! -f "$STATE_FILE" ] && echo "normal" > "$STATE_FILE"
CURRENT=$(cat "$STATE_FILE")

if [ "$CURRENT" = "normal" ]; then
    xrandr --output "$MONITOR" --rotate inverted
    echo "inverted" > "$STATE_FILE"
    echo "Orientation: inverted (landscape flipped)"
else
    xrandr --output "$MONITOR" --rotate normal
    echo "normal" > "$STATE_FILE"
    echo "Orientation: normal"
fi
