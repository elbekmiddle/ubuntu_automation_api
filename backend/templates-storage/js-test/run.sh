#!/bin/bash

node <<'EOF'
const mem = {
  swapused: 3.04,
  swaptotal: 11,
};

const usedPercent =
  mem.swaptotal > 0
    ? Math.round((mem.swapused / mem.swaptotal) * 10000) / 100
    : 0;

console.log(`Swap used: ${usedPercent}%`);
EOF