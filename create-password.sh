#!/bin/bash

# This script generates a password file for Nginx basic authentication
# Usage: ./create-password.sh username password

if [ $# -ne 2 ]; then
  echo "Usage: $0 username password"
  exit 1
fi

USERNAME=$1
PASSWORD=$2

# Install apache2-utils if not available (contains htpasswd)
command -v htpasswd >/dev/null 2>&1 || { 
  echo "Installing htpasswd tool..." 
  sudo apt-get update && sudo apt-get install -y apache2-utils
}

# Create or update password file
mkdir -p nginx/passwords
htpasswd -bc nginx/passwords/htpasswd $USERNAME $PASSWORD

echo "Password file created successfully!"
echo "Username: $USERNAME"
echo "Password file: nginx/passwords/htpasswd"
