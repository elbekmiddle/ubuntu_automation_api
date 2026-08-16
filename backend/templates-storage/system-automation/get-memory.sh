#!/bin/bash

echo "=== Memory ==="

free -h | grep '^Mem:' | tr -s ' ' | cut -d' ' -f1-4