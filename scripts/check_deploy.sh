#!/bin/bash
set -e
# This wrapper ensures we capture the real exit code from the deploy.sh script
chmod +x /tmp/deploy.sh
/tmp/deploy.sh
exit $?