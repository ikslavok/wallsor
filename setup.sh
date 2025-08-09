#!/bin/bash

# Create SvelteKit project
npx sv create wallsor-temp --template minimal --types ts --no-add-ons --no-install

# Move files from temp to current directory
mv wallsor-temp/* .
mv wallsor-temp/.* . 2>/dev/null || true
rmdir wallsor-temp

echo "Project structure created"