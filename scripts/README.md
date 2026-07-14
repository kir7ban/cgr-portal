# Azure Deployment Scripts

This directory contains deployment and validation scripts for the Bosch Internal Communications Platform on Azure.

## Files

### `deploy.sh`

**Comprehensive Azure deployment script** — Provisions all resources for a complete environment.

#### Features

- Creates Azure Resource Group
- Provisions CosmosDB account and database
- Creates 7 CosmosDB collections with proper partition keys
- Sets up Azure App Service Plan and App Service
- Configures health check endpoints
- Sets environment variables automatically
- Saves deployment configuration to `.deployment-{env}.json`

#### Usage

```bash
# Make executable
chmod +x deploy.sh

# Deploy to dev environment
./deploy.sh dev eastus

# Deploy to staging
./deploy.sh staging westeurope

# Deploy to production
./deploy.sh prod westeurope
```

#### Parameters

- `$1` — Environment: `dev`, `staging`, or `prod` (default: `dev`)
- `$2` — Azure Region: `eastus`, `westeurope`, `southcentralus`, etc. (default: `eastus`)

#### Output

Creates `.deployment-{env}.json` with:

```json
{
  "timestamp": "2026-07-13T10:00:00Z",
  "environment": "dev",
  "resourceGroup": "cgr-dev-rg",
  "appService": "cgr-dev-api",
  "cosmosdbAccount": "cgr-dev-db",
  "cosmosdbDatabase": "cgr_platform"
}
```

#### Prerequisites

- Azure CLI installed and authenticated (`az login`)
- `jq` installed (JSON processor)
- Azure subscription with appropriate permissions

---

### `validate-deployment.sh`

**Post-deployment validation script** — Verifies all resources are correctly provisioned.

#### Features

- Checks resource group exists
- Verifies CosmosDB account and database
- Confirms App Service is running
- Validates environment variables are set
- Checks all required collections exist
- Tests health check endpoints
- Provides detailed validation report with color-coded output

#### Usage

```bash
# Make executable
chmod +x validate-deployment.sh

# Validate dev environment
./validate-deployment.sh dev

# Validate production
./validate-deployment.sh prod
```

#### Output

```
✓ Resource Group exists: cgr-dev-rg
✓ CosmosDB account exists: cgr-dev-db
✓ Database exists: cgr_platform
✓ Collection exists: posts
✓ Collection exists: comments
✓ Collection exists: reactions
✓ Collection exists: users
✓ Collection exists: approvals
✓ Collection exists: audit_logs
✓ Collection exists: analytics
✓ App Service exists: cgr-dev-api
✓ State: Running
✓ Health Check: /api/health
✓ COSMOSDB_CONNECTION_STRING is set
✓ COSMOSDB_DATABASE is set
✓ ENVIRONMENT is set
✓ NODE_ENV is set
✓ JWT_SECRET is set

✓ All checks passed!
```

---

### `deploy-config.json`

**Deployment configuration template** — Defines settings for all environments.

#### Structure

```json
{
  "environments": {
    "dev": {
      "region": "eastus",
      "appServiceSku": "B1",
      "cosmosdb": {
        "throughput": 400
      }
    },
    "staging": {
      "region": "westeurope",
      "appServiceSku": "S1",
      "cosmosdb": {
        "throughput": 600
      }
    },
    "prod": {
      "region": "westeurope",
      "appServiceSku": "P1V2",
      "cosmosdb": {
        "throughput": 1000
      }
    }
  },
  "cosmosdbCollections": {
    "posts": {...},
    "comments": {...},
    "reactions": {...},
    "users": {...},
    "approvals": {...},
    "audit_logs": {...},
    "analytics": {...}
  }
}
```

#### Usage

Referenced by `deploy.sh` for environment-specific settings. Can be extended for custom configuration management.

---

## Deployment Workflow

### Quick Start (Recommended)

```bash
# 1. Deploy to dev
./scripts/deploy.sh dev eastus

# 2. Validate deployment
./scripts/validate-deployment.sh dev

# 3. Build and deploy application
npm run build
npm start
```

### Production Deployment

```bash
# 1. Deploy infrastructure
./scripts/deploy.sh prod westeurope

# 2. Validate
./scripts/validate-deployment.sh prod

# 3. Deploy application (via GitHub Actions or manual)
# See DEPLOYMENT.md for options
```

---

## Environment-Specific Settings

### Development (`dev`)

| Component | Setting |
|-----------|---------|
| App Service SKU | B1 (basic) |
| CosmosDB Throughput | 400 RU/s |
| Region | East US |
| Node.js | 18-LTS |
| Mock Auth | Enabled |

**Monthly Cost:** ~$40

### Staging (`staging`)

| Component | Setting |
|-----------|---------|
| App Service SKU | S1 (standard) |
| CosmosDB Throughput | 600 RU/s |
| Region | West Europe |
| Node.js | 18-LTS |
| Mock Auth | Disabled |

**Monthly Cost:** ~$100

### Production (`prod`)

| Component | Setting |
|-----------|---------|
| App Service SKU | P1V2 (premium) |
| CosmosDB Throughput | 1000 RU/s |
| Region | West Europe |
| Node.js | 18-LTS |
| Mock Auth | Disabled |

**Monthly Cost:** ~$150-200

---

## Health Check Endpoints

Once deployed, the API provides health monitoring endpoints:

```bash
# Basic health
curl https://{app-url}/api/health

# Liveness (for restart policies)
curl https://{app-url}/api/health/live

# Readiness (for load balancer)
curl https://{app-url}/api/health/ready

# Detailed diagnostics
curl https://{app-url}/api/health/detailed
```

See `../docs/DEPLOYMENT.md` for details on health check integration.

---

## Environment Variables

The deployment script automatically sets:

| Variable | Value |
|----------|-------|
| `COSMOSDB_CONNECTION_STRING` | From Azure |
| `COSMOSDB_DATABASE` | `cgr_platform` |
| `COSMOSDB_ENDPOINT` | From Azure |
| `COSMOSDB_PRIMARY_KEY` | From Azure |
| `ENVIRONMENT` | `dev`, `staging`, or `prod` |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `JWT_SECRET` | Auto-generated (32-byte random) |

Additional variables can be set via `az webapp config appsettings set`.

See `.env.example` in project root for complete list.

---

## Troubleshooting

### Script Fails: "Azure CLI not found"

Install Azure CLI: https://docs.microsoft.com/cli/azure/install-azure-cli

### Script Fails: "Not authenticated with Azure"

Run: `az login`

### Health Check Endpoint Fails

1. Check if App Service is running: `az webapp show --resource-group cgr-dev-rg --name cgr-dev-api`
2. Check logs: `az webapp log tail --resource-group cgr-dev-rg --name cgr-dev-api`
3. Verify environment variables: `az webapp config appsettings list --resource-group cgr-dev-rg --name cgr-dev-api`

### CosmosDB Connection Fails

1. Verify account exists: `az cosmosdb show --resource-group cgr-dev-rg --name cgr-dev-db`
2. Check connection string: `az cosmosdb keys list --resource-group cgr-dev-rg --name cgr-dev-db --type connection-strings`
3. Verify firewall rules: `az cosmosdb network-rule list --resource-group cgr-dev-rg --name cgr-dev-db`

---

## Advanced Usage

### Custom Region

```bash
./scripts/deploy.sh dev southcentralus
```

### Manual Collection Creation

```bash
az cosmosdb sql container create \
  --resource-group cgr-dev-rg \
  --account-name cgr-dev-db \
  --database-name cgr_platform \
  --name custom_collection \
  --partition-key-path "/id"
```

### Update Environment Variables

```bash
az webapp config appsettings set \
  --resource-group cgr-dev-rg \
  --name cgr-dev-api \
  --settings KEY=value
```

### Scale CosmosDB Throughput

```bash
az cosmosdb sql database throughput update \
  --resource-group cgr-dev-rg \
  --account-name cgr-dev-db \
  --name cgr_platform \
  --throughput 800
```

---

## CI/CD Integration

For GitHub Actions integration, see `.github/workflows/ci.yml`.

Example deploy step:

```yaml
- name: Deploy to Azure
  run: |
    chmod +x scripts/deploy.sh
    ./scripts/deploy.sh ${{ env.ENVIRONMENT }} ${{ env.REGION }}
```

---

## References

- [Azure CosmosDB CLI Commands](https://learn.microsoft.com/cli/azure/cosmosdb/)
- [Azure App Service CLI Commands](https://learn.microsoft.com/cli/azure/webapp/)
- [Azure Deployment Guide](../docs/DEPLOYMENT.md)
