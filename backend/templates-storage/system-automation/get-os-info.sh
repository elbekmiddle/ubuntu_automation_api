#!/bin/bash

echo "=== Operating System ==="

grep '^PRETTY_NAME=' /etc/os-release | cut -d= -f2-

echo ""

echo "=== Version ==="

grep '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"'

echo ""

echo "=== Architecture ==="

uname -m