#!/bin/bash

app_env=${1:-development}

# Development environment commands
dev_commands() {
    echo "Running TripMind backend in development mode..."
    npm run start:dev
}

# Production environment commands
prod_commands() {
    echo "Building TripMind backend..."
    npm run build
    echo "Starting TripMind backend in production mode..."
    npm run start
}

# Check environment variables to determine the running environment
if [ "$app_env" = "production" ] || [ "$app_env" = "prod" ] ; then
    echo "Production environment detected"
    prod_commands
else
    echo "Development environment detected"
    dev_commands
fi
