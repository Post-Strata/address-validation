#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e
# Create deployment directory
mkdir -p /home/$USER

# Extract the deployment package (now contains a nested directory)
tar -xzf /tmp/deploy.tar.gz -C /home/$USER/

# Get the extracted directory name (latest address-validation-* directory)
DEPLOY_DIR=$(ls -td /home/$USER/address-validation-* | head -1)
echo "Deployment directory: $DEPLOY_DIR"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Node.js not found, installing..."
  # Install Node.js using NVM
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
  source ~/.nvm/nvm.sh
  nvm install 18.20.8
  nvm use 18.20.8

  # Verify installation
  node --version
  npm --version
fi

# Move to the deployment directory
cd $DEPLOY_DIR

# Make sure we're using the right Node.js version
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18.20.8 || nvm install 18.20.8

# Install dependencies and build
echo "Installing dependencies..."
npm ci

echo "Building application..."
# Run build with detailed error output and explicit exit on failure
npm run build || {
  echo "❌ BUILD ERROR ❌"
  echo "Build failed, check for Vite/Rollup resolution errors."
  echo "You may need to add external dependencies in vite.config.ts."
  exit 1
}

# Test database connection before running migrations
echo "Testing database connection with Prisma..."
# Use a simple connection test instead of db pull which might fail on empty databases
npx prisma validate || {
  echo "❌ DATABASE CONNECTION ERROR ❌"
  echo "Failed to connect to the database. Check your DATABASE_URL environment variable."
  echo "Attempting to parse DATABASE_URL for troubleshooting (credentials redacted):"
  echo ${DATABASE_URL} | grep -o 'postgresql://[^:]*:[^@]*@[^/]*/' | sed 's/\(postgresql:\/\/[^:]*\):[^@]*\(@.*\)/\1:REDACTED\2/'
  exit 1
}

# Run database migrations
echo "Database connection successful, running migrations..."
echo "This will create tables if they don't exist..."
npm run setup

# Create or update the symlink to the current deployment
ln -sfn $DEPLOY_DIR /home/$USER/current

# Create service unit file content
SERVICE_CONTENT="[Unit]
Description=Address Validation Shopify App
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=/home/${USER}/current
ExecStart=/home/${USER}/.nvm/versions/node/v18.20.8/bin/npm run start
Restart=always
Environment=NODE_ENV=production
Environment=PATH=/home/${USER}/.nvm/versions/node/v18.20.8/bin:/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target"

# Always recreate the systemd service file to ensure it uses the correct Node version
if [ -f /etc/systemd/system/address-validation.service ]; then
  echo "Removing existing service file to ensure latest version is used"
  sudo rm /etc/systemd/system/address-validation.service
fi

# Write the service file content to a temporary file
echo "$SERVICE_CONTENT" > /tmp/address-validation.service

# Move the file to systemd directory
sudo mv /tmp/address-validation.service /etc/systemd/system/

# Reload and enable the service
sudo systemctl daemon-reload
sudo systemctl enable address-validation

# Restart the service
sudo systemctl restart address-validation

# Clean up
rm /tmp/deploy.tar.gz

# Keep only the 3 most recent deployments
cd /home/$USER
ls -dt /home/$USER/address-validation-* | tail -n +4 | xargs -r rm -rf