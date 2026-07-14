# Azure Deployment Guide

**Issue #21:** App Service + CosmosDB provisioning, env vars, health check

This guide covers deploying the Bosch Internal Communications Platform to Azure.

---

## Overview

The deployment creates:

- **Azure Resource Group** — Container for all resources
- **Azure CosmosDB** — Database with 7 collections (posts, comments, reactions, users, approvals, audit_logs, analytics)
- **Azure App Service** — Hosts the Node.js/NestJS API and static React frontend
- **Health Check Endpoints** — Liveness, readiness, and detailed diagnostics probes

---

## Prerequisites

### Required Tools

```bash
# Azure CLI
brew install azure-cli

# macOS/Linux: curl install
curl -sL https://aka.ms/InstallAzureCLIDeb | bash

# Windows: Download installer or use Chocolatey
choco install azure-cli

# JSON query tool
brew install jq

# Verify installations
az --version
jq --version
```

### Azure Account & Authentication

```bash
# Sign in to Azure
az login

# Verify authenticated account
az account show

# List available subscriptions
az account list

# Set active subscription (if multiple)
az account set --subscription "subscription-id-or-name"
```

### Required Permissions

You must have the following Azure RBAC roles in the subscription:

- **Contributor** (minimum) — to create resources
- Or specific roles:
  - `Cosmos DB Account Contributor`
  - `App Service Contributor`
  - `Storage Account Contributor`
  - `Key Vault Administrator`

---

## Quick Start Deployment

### 1. Run the Deployment Script

```bash
# Navigate to project root
cd cgr-mvp

# Make script executable
chmod +x scripts/deploy.sh

# Deploy to development environment
./scripts/deploy.sh dev eastus

# Deploy to staging
./scripts/deploy.sh staging westeurope

# Deploy to production
./scripts/deploy.sh prod westeurope
```

### 2. Script Output

The script will:

✓ Verify prerequisites (Azure CLI, jq, authentication)
✓ Create Azure Resource Group
✓ Provision CosmosDB account and database
✓ Create CosmosDB collections (posts, comments, reactions, users, approvals, audit_logs, analytics)
✓ Create App Service Plan and App Service
✓ Configure health check endpoint
✓ Set environment variables
✓ Save deployment configuration to `.deployment-{env}.json`

### 3. Verify Deployment

```bash
# List created resources
az group list --output table

# Check CosmosDB account
az cosmosdb show --resource-group cgr-dev-rg --name cgr-dev-db

# Check App Service
az webapp show --resource-group cgr-dev-rg --name cgr-dev-api

# Get App Service URL
az webapp show --resource-group cgr-dev-rg --name cgr-dev-api \
  --query defaultHostName --output tsv
```

---

## Manual Deployment Steps (Alternative)

If you prefer to deploy manually or integrate with IaC tools:

### Create Resource Group

```bash
ENVIRONMENT=dev
REGION=eastus
RESOURCE_GROUP=cgr-${ENVIRONMENT}-rg

az group create \
  --name "$RESOURCE_GROUP" \
  --location "$REGION" \
  --tags "environment=$ENVIRONMENT"
```

### Create CosmosDB Account

```bash
COSMOSDB_ACCOUNT=cgr${ENVIRONMENT}db
COSMOSDB_DATABASE=cgr_platform
COSMOSDB_THROUGHPUT=400

# Create account
az cosmosdb create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$COSMOSDB_ACCOUNT" \
  --locations regionName="$REGION" failoverPriority=0 \
  --default-consistency-level Session \
  --tags "environment=$ENVIRONMENT"

# Create database
az cosmosdb sql database create \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$COSMOSDB_ACCOUNT" \
  --name "$COSMOSDB_DATABASE" \
  --throughput "$COSMOSDB_THROUGHPUT"
```

### Create CosmosDB Collections

```bash
# posts collection
az cosmosdb sql container create \
  --resource-group "$RESOURCE_GROUP" \
  --account-name "$COSMOSDB_ACCOUNT" \
  --database-name "$COSMOSDB_DATABASE" \
  --name "posts" \
  --partition-key-path "/id" \
  --throughput "$COSMOSDB_THROUGHPUT"

# Repeat for: comments, reactions, users, approvals, audit_logs, analytics
```

### Create App Service

```bash
APP_SERVICE_PLAN=cgr-${ENVIRONMENT}-asp
APP_SERVICE=cgr-${ENVIRONMENT}-api
SKU=B1

# Create App Service Plan
az appservice plan create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE_PLAN" \
  --sku "$SKU" \
  --is-linux

# Create App Service
az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --name "$APP_SERVICE" \
  --runtime "NODE|18-lts"

# Configure health check
az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --health-check-path "/api/health"
```

### Set Environment Variables

```bash
# Get CosmosDB connection string
COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
  --resource-group "$RESOURCE_GROUP" \
  --name "$COSMOSDB_ACCOUNT" \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" \
  --output tsv)

# Set App Service environment variables
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_SERVICE" \
  --settings \
    COSMOSDB_CONNECTION_STRING="$COSMOS_CONNECTION_STRING" \
    COSMOSDB_DATABASE="$COSMOSDB_DATABASE" \
    ENVIRONMENT="$ENVIRONMENT" \
    NODE_ENV="production" \
    PORT="8080" \
    JWT_SECRET="$(openssl rand -base64 32)"
```

---

## Health Check Endpoints

Once deployed, the API will expose health check endpoints:

### Liveness Probe

```bash
curl https://{app-service-url}/api/health/live
# Response: 200 if process is running
```

**Use case:** Kubernetes/orchestration system restart policy

### Readiness Probe

```bash
curl https://{app-service-url}/api/health/ready
# Response: 200 if all dependencies (CosmosDB) are available
```

**Use case:** Load balancer health check, prevent traffic during initialization

### Basic Health

```bash
curl https://{app-service-url}/api/health
# Response: 
# {
#   "status": "healthy",
#   "timestamp": "2026-07-13T10:00:00.000Z",
#   "uptime": 3600000,
#   "memoryUsage": {...}
# }
```

### Detailed Diagnostics

```bash
curl https://{app-service-url}/api/health/detailed
# Response:
# {
#   "status": "healthy",
#   "timestamp": "2026-07-13T10:00:00.000Z",
#   "version": "0.1.0",
#   "environment": "production",
#   "uptime": 3600,
#   "checks": [
#     {
#       "name": "nodejs_runtime",
#       "status": "ok",
#       "details": {...}
#     },
#     {
#       "name": "memory_usage",
#       "status": "ok",
#       "details": {...}
#     },
#     {
#       "name": "environment_configuration",
#       "status": "ok",
#       "details": {...}
#     },
#     {
#       "name": "cosmosdb_connectivity",
#       "status": "ok",
#       "details": {...}
#     }
#   ]
# }
```

---

## Environment Variables

### Required for Production

```env
COSMOSDB_CONNECTION_STRING=AccountEndpoint=https://...
COSMOSDB_DATABASE=cgr_platform
COSMOSDB_ENDPOINT=https://...documents.azure.com:443/
COSMOSDB_PRIMARY_KEY=<key>
ENVIRONMENT=production
NODE_ENV=production
PORT=8080
JWT_SECRET=<random-string>
```

### Optional

```env
LOG_LEVEL=info
MOCK_AUTH_ENABLED=false
MAX_UPLOAD_SIZE=10485760
AUTO_ARCHIVE_DAYS=365
AUDIT_LOG_RETENTION_DAYS=1095
```

See `.env.example` for complete list.

---

## Deployment to App Service

### Option 1: GitHub Actions (Recommended)

The CI/CD pipeline in `.github/workflows/ci.yml` can be configured to auto-deploy on push:

```yaml
- name: Deploy to App Service
  uses: azure/webapps-deploy@v2
  with:
    app-name: ${{ env.APP_SERVICE_NAME }}
    publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
    package: ./dist.zip
```

### Option 2: Manual ZIP Deployment

```bash
# Build the application
npm run build

# Create deployment package
cd dist && zip -r ../dist.zip . && cd ..

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group cgr-dev-rg \
  --name cgr-dev-api \
  --src dist.zip
```

### Option 3: Git-based Deployment

```bash
# Set deployment credentials
az webapp deployment user set --user-name <username> --password <password>

# Get deployment source config
az webapp deployment source config-local-git \
  --resource-group cgr-dev-rg \
  --name cgr-dev-api

# Add Azure remote to git repo
git remote add azure <deployment-url>

# Deploy
git push azure main
```

---

## CosmosDB Collections Schema

### posts

```json
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "status": "draft|submitted|approved|rejected|published|revoked|archived",
  "authorId": "string",
  "authorDepartment": "string",
  "createdAt": "timestamp",
  "submittedAt": "timestamp",
  "publishedAt": "timestamp",
  "archivedAt": "timestamp",
  "revokedAt": "timestamp",
  "audienceScope": "organization-wide|department-only|custom",
  "customAudience": ["group-id"],
  "metadata": {
    "images": ["url"],
    "documents": ["url"],
    "videos": ["url"]
  }
}
```

### approvals

```json
{
  "id": "uuid",
  "postId": "string",
  "status": "pending|approved|rejected|feedback|pending-review",
  "reviewedBy": "string",
  "reviewedAt": "timestamp",
  "decision": "approve|reject|request-feedback|pending-review",
  "feedback": "string",
  "reviewerComments": "string"
}
```

### audit_logs

```json
{
  "id": "uuid",
  "timestamp": "timestamp",
  "action": "post_created|post_submitted|post_approved|comment_deleted|...",
  "actor": "string",
  "actorRole": "employee|comms-officer|admin",
  "subject": "post|comment|approval",
  "subjectId": "string",
  "details": {}
}
```

See `REQUIREMENTS.md` for complete schema.

---

## Monitoring & Logging

### Enable Application Insights

```bash
# Create Application Insights resource
az monitor app-insights component create \
  --resource-group cgr-dev-rg \
  --app cgr-dev-insights \
  --location "$REGION"

# Link to App Service
az webapp config appsettings set \
  --resource-group cgr-dev-rg \
  --name cgr-dev-api \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<instrumentation-key>"
```

### View Logs

```bash
# Stream live logs
az webapp log tail --resource-group cgr-dev-rg --name cgr-dev-api

# Download logs
az webapp log download --resource-group cgr-dev-rg --name cgr-dev-api
```

### Monitor CosmosDB Throughput

```bash
# View current RU consumption
az monitor metrics list \
  --resource cgr-dev-db \
  --resource-group cgr-dev-rg \
  --metric "Total Requests"
```

---

## Cost Estimation (MVP)

| Component | Tier | Cost/Month |
|-----------|------|-----------|
| App Service Plan | B1 (basic) | ~$15 |
| CosmosDB (400 RU/s) | Provisioned | ~$25 |
| Application Insights | Standard | ~$0 (first 5GB free) |
| **Total** | | ~$40/month |

**Production:** ~$150-200/month for P1V2 + 1000 RU/s

---

## Troubleshooting

### Health Check Fails

```bash
# 1. Check if environment variables are set
az webapp config appsettings list \
  --resource-group cgr-dev-rg \
  --name cgr-dev-api

# 2. Check CosmosDB connectivity
az cosmosdb check-throughput \
  --resource-group cgr-dev-rg \
  --name cgr-dev-db

# 3. View application logs
az webapp log tail --resource-group cgr-dev-rg --name cgr-dev-api
```

### CosmosDB Connection Timeout

```bash
# Verify CosmosDB account is running
az cosmosdb show --resource-group cgr-dev-rg --name cgr-dev-db

# Check firewall rules
az cosmosdb network-rule list \
  --resource-group cgr-dev-rg \
  --name cgr-dev-db
```

### App Service Not Starting

```bash
# Check deployment logs
az webapp deployment log show \
  --resource-group cgr-dev-rg \
  --name cgr-dev-api

# Restart app service
az webapp restart \
  --resource-group cgr-dev-rg \
  --name cgr-dev-api
```

---

## Scaling

### Increase CosmosDB Throughput

```bash
# For dev
az cosmosdb sql database throughput update \
  --resource-group cgr-dev-rg \
  --account-name cgr-dev-db \
  --name cgr_platform \
  --throughput 800

# For prod
az cosmosdb sql database throughput update \
  --resource-group cgr-prod-rg \
  --account-name cgr-prod-db \
  --name cgr_platform \
  --throughput 2000
```

### Scale Up App Service

```bash
# Change SKU
az appservice plan update \
  --resource-group cgr-dev-rg \
  --name cgr-dev-asp \
  --sku S1

# Scale out (multiple instances)
az appservice plan update \
  --resource-group cgr-dev-rg \
  --name cgr-dev-asp \
  --number-of-workers 3
```

---

## Cleanup

### Remove All Resources

```bash
# Delete entire resource group (DESTRUCTIVE)
az group delete \
  --name cgr-dev-rg \
  --yes

# Or delete specific resources
az cosmosdb delete \
  --resource-group cgr-dev-rg \
  --name cgr-dev-db
```

---

## Next Steps

1. **Integrate with CI/CD** — Set up GitHub Actions for auto-deployment
2. **Add Application Insights** — Monitor performance and errors
3. **Configure HTTPS/TLS** — Use Azure App Service SSL certificates
4. **Set up alerts** — Monitor CosmosDB throughput and error rates
5. **Implement backups** — CosmosDB backup policy for production
6. **Security hardening** — Azure Key Vault for secrets, network security groups

---

## References

- [Azure CosmosDB Documentation](https://learn.microsoft.com/azure/cosmos-db/)
- [Azure App Service Documentation](https://learn.microsoft.com/azure/app-service/)
- [Azure CLI Commands](https://learn.microsoft.com/cli/azure/)
- [NestJS Deployment on Azure](https://docs.nestjs.com/deployment/aws)
