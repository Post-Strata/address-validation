# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands

- Install dependencies: `npm install`
- Development: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Setup DB: `npm run setup` (prisma generate && prisma migrate deploy)
- Deploy: `npm run deploy`

## Code Style Guidelines

- **Framework**: Remix + Shopify App Remix
- **Formatting**: Uses Prettier
- **Linting**: ESLint with @remix-run/eslint-config, @remix-run/eslint-config/node
- **TypeScript**: Strict mode enabled
- **Components**: Use Polaris for UI components
- **Naming**: Use camelCase for variables, PascalCase for components
- **Imports**: Group imports by type (React, Remix, Shopify, local)
- **Links**: Use `Link` from `@remix-run/react` or `@shopify/polaris`, not `<a>`
- **Redirects**: Use `redirect` from `authenticate.admin`, not from `@remix-run/node`
- **Forms**: Use `useSubmit` or `<Form/>` from `@remix-run/react`, not lowercase `<form/>`
- **Error Handling**: Use appropriate error boundaries and logging

## Project Architecture

### Address Validation Extension

This project includes a Shopify checkout extension for address validation that:

1. Validates US shipping addresses during checkout
2. Integrates with USPS Address API 3.0 to retrieve ZIP+4 codes
3. Enhances delivery precision by suggesting complete 9-digit ZIP codes

### Database Architecture

The application uses Prisma ORM with PostgreSQL in production:

1. Uses SQLite for local development and PostgreSQL for production
2. Database schema is defined in `prisma/schema.prisma`
3. Database connection is configured via environment variables:
   - `DATABASE_PROVIDER`: Set to "postgresql" for production
   - `DATABASE_URL`: Connection string to the PostgreSQL database

### Deployment Architecture

The application uses GitHub Actions for continuous deployment:

1. `.github/workflows/deploy-app.yml`: Deploys the Remix application to EC2 and the Shopify extension to Shopify
2. Terraform for infrastructure provisioning (manual process)
3. Local testing using Act for GitHub Actions

#### Local GitHub Actions Testing

The repository includes scripts for testing GitHub Actions locally using Act:

- `run-actions-locally.sh`: Runs GitHub Actions workflows locally with actual execution
- `dryrun-actions.sh`: Previews GitHub Actions workflows without executing commands

Usage:
```bash
# Full run
./run-actions-locally.sh

# Dry run
./dryrun-actions.sh

# Run specific workflow
./run-actions-locally.sh --workflow=deploy-app.yml --job=deploy
```

Required files for local testing:
- `.secrets`: Contains GitHub secrets (add your values, gitignored)
- `.actrc`: Configuration for Act
- `.env.local`: Environment variables for local testing

### Infrastructure as Code

The project uses Terraform to provision and manage AWS resources:

- `terraform/production/`: Contains Terraform configurations for production deployment
  - `main.tf`: Defines AWS resources (EC2, security groups, Route 53)
  - `variables.tf`: Defines input variables for the Terraform configuration
  - `backend.tf`: Configures remote state management
  - `outputs.tf`: Defines outputs from the Terraform configuration
  - `terraform.tfvars`: Contains values for the variables (gitignored for sensitive data)

### Environment Variables

The following environment variables are required:

#### Database Connection
- `DATABASE_PROVIDER`: Database provider (e.g., "postgresql")
- `DATABASE_URL`: Database connection string

#### Shopify Integration
- `SHOPIFY_API_KEY`: Shopify API key
- `SHOPIFY_API_SECRET`: Shopify API secret
- `SHOPIFY_APP_URL`: URL of the application
- `SCOPES`: Comma-separated list of OAuth scopes

#### USPS Integration
- `USPS_CONSUMER_KEY`: Your USPS API key
- `USPS_CONSUMER_SECRET`: Your USPS Consumer ID

### API Endpoints

- `/api/validate-address`: Validates shipping addresses using USPS Address API 3.0
  - Receives POST requests with address data
  - Returns validation results with ZIP+4 data if available
  - Includes comprehensive error logging

### Server Architecture

The application is served through Nginx as a reverse proxy:
- Nginx listens on ports 80 (HTTP) and 443 (HTTPS)
- All HTTP traffic is redirected to HTTPS for security
- HTTPS is configured with Let's Encrypt certificates that auto-renew
- Nginx proxies requests to the Node.js application running on port 3000
- The setup works on both Amazon Linux 2 and Amazon Linux 2023
  
### USPS API Authentication

The app supports multiple authentication methods for the USPS Address API 3.0:

1. **Basic Auth + API Key Headers**: Combines Basic Auth (base64 encoded credentials) with API key headers
2. **URL Parameters**: Passes authentication in URL parameters for legacy API support
3. **Username/Password Headers**: Uses explicit Username/Password headers

The implementation automatically tries all methods and uses the first successful one.

### CORS Configuration

The API endpoints include comprehensive CORS support:
- Preflight handling for OPTIONS requests
- Proper headers for cross-origin requests from checkout extensions
- Authentication bypass for test requests in development

### Extension Components

- `extensions/address-validation/src/Checkout.tsx`: Main extension component
  - Displays validation UI before the checkout address form
  - Allows customers to opt-in to enhanced ZIP+4 codes
  - Prevents checkout with invalid addresses