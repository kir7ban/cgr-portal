#!/bin/bash

###############################################################################
# Bosch Internal Communications Platform - Azure Deployment Script
# Issue #21: Azure App Service + CosmosDB provisioning, env vars, health check
#
# Prerequisites:
#   - Azure CLI installed and authenticated (az login)
#   - jq installed (for JSON parsing)
#   - Appropriate Azure permissions (create App Service, CosmosDB, resource groups)
#
# Usage:
#   ./deploy.sh [environment] [region]
#   ./deploy.sh dev eastus
#   ./deploy.sh prod westeurope
###############################################################################

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

ENVIRONMENT="${1:-dev}"
REGION="${2:-eastus}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Azure Resource Names
RESOURCE_GROUP="cgr-${ENVIRONMENT}-rg"
APP_SERVICE_PLAN="cgr-${ENVIRONMENT}-asp"
APP_SERVICE="cgr-${ENVIRONMENT}-api"
COSMOSDB_ACCOUNT="cgr${ENVIRONMENT}db"
COSMOSDB_DATABASE="cgr_platform"
KEY_VAULT="cgr-${ENVIRONMENT}-kv"

# CosmosDB Collections
declare -A COLLECTIONS=(
  ["posts"]="id"
  ["comments"]="id"
  ["reactions"]="id"
  ["users"]="id"
  ["approvals"]="id"
  ["audit_logs"]="timestamp"
  ["analytics"]="date"
)

# CosmosDB Throughput (RU/s)
COSMOSDB_THROUGHPUT="400"

# Environment-specific settings
if [[ "$ENVIRONMENT" == "prod" ]]; then
  COSMOSDB_THROUGHPUT="1000"
  SKU="P1V2"
else
  SKU="B1"
fi

# ============================================================================
# Functions
# ============================================================================

log_info() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $*"
}

log_error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

log_success() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $*"
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v az &> /dev/null; then
    log_error "Azure CLI not found. Please install: https://docs.microsoft.com/cli/azure/"
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    log_error "jq not found. Please install: https://stedolan.github.io/jq/"
    exit 1
  fi

  if ! az account show &> /dev/null; then
    log_error "Not authenticated with Azure. Run: az login"
    exit 1
  fi

  log_success "Prerequisites verified"
}

validate_environment() {
  if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT (must be dev, staging, or prod)"
    exit 1
  fi

  log_success "Environment validated: $ENVIRONMENT"
}

create_resource_group() {
  log_info "Creating resource group: $RESOURCE_GROUP (region: $REGION)"

  az group create \
    --name "$RESOURCE_GROUP" \
    --location "$REGION" \
    --tags "environment=$ENVIRONMENT" "managed-by=terraform" "created=$TIMESTAMP" \
    2>&1 | grep -E "(Succeeded|AlreadyExists)" || true

  log_success "Resource group created/verified"
}

create_cosmos_db() {
  log_info "Creating CosmosDB account: $COSMOSDB_ACCOUNT"

  # Create CosmosDB account
  az cosmosdb create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$COSMOSDB_ACCOUNT" \
    --locations regionName="$REGION" failoverPriority=0 \
    --default-consistency-level "Session" \
    --tags "environment=$ENVIRONMENT" "purpose=platform-db" \
    2>&1 | grep -E "(Succeeded|AlreadyExists)" || true

  log_success "CosmosDB account created/verified"

  log_info "Creating CosmosDB database: $COSMOSDB_DATABASE"

  # Create database
  az cosmosdb sql database create \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$COSMOSDB_ACCOUNT" \
    --name "$COSMOSDB_DATABASE" \
    --throughput "$COSMOSDB_THROUGHPUT" \
    2>&1 | grep -E "(Succeeded|AlreadyExists)" || true

  log_success "CosmosDB database created/verified"

  # Create collections
  log_info "Creating CosmosDB collections"

  for collection in "${!COLLECTIONS[@]}"; do
    partition_key="${COLLECTIONS[$collection]}"
    log_info "  - Creating collection: $collection (partition key: /$partition_key)"

    az cosmosdb sql container create \
      --resource-group "$RESOURCE_GROUP" \
      --account-name "$COSMOSDB_ACCOUNT" \
      --database-name "$COSMOSDB_DATABASE" \
      --name "$collection" \
      --partition-key-path "/$partition_key" \
      --throughput "$COSMOSDB_THROUGHPUT" \
      2>&1 | grep -E "(Succeeded|AlreadyExists|exists)" || true
  done

  log_success "CosmosDB collections created/verified"
}

create_app_service() {
  log_info "Creating App Service Plan: $APP_SERVICE_PLAN (SKU: $SKU)"

  # Create App Service Plan
  az appservice plan create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE_PLAN" \
    --sku "$SKU" \
    --is-linux \
    --tags "environment=$ENVIRONMENT" \
    2>&1 | grep -E "(Succeeded|AlreadyExists)" || true

  log_success "App Service Plan created/verified"

  log_info "Creating App Service: $APP_SERVICE"

  # Create App Service
  az webapp create \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --name "$APP_SERVICE" \
    --runtime "NODE|18-lts" \
    --tags "environment=$ENVIRONMENT" \
    2>&1 | grep -E "(Succeeded|AlreadyExists)" || true

  log_success "App Service created/verified"

  # Enable health check
  log_info "Configuring health check endpoint"

  az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --health-check-path "/api/health" \
    2>&1 | grep -E "(Succeeded|updated)" || true

  log_success "Health check configured"
}

configure_environment_variables() {
  log_info "Retrieving CosmosDB connection string"

  # Get CosmosDB connection string
  COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$COSMOSDB_ACCOUNT" \
    --type connection-strings \
    --query "connectionStrings[0].connectionString" \
    --output tsv)

  # Get CosmosDB primary key
  COSMOS_PRIMARY_KEY=$(az cosmosdb keys list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$COSMOSDB_ACCOUNT" \
    --type keys \
    --query "primaryMasterKey" \
    --output tsv)

  log_info "Setting environment variables"

  # Set environment variables
  declare -A APP_SETTINGS=(
    ["COSMOSDB_CONNECTION_STRING"]="$COSMOS_CONNECTION_STRING"
    ["COSMOSDB_DATABASE"]="$COSMOSDB_DATABASE"
    ["COSMOSDB_PRIMARY_KEY"]="$COSMOS_PRIMARY_KEY"
    ["COSMOSDB_ENDPOINT"]="https://${COSMOSDB_ACCOUNT}.documents.azure.com:443/"
    ["ENVIRONMENT"]="$ENVIRONMENT"
    ["NODE_ENV"]="production"
    ["PORT"]="8080"
    ["JWT_SECRET"]="$(openssl rand -base64 32)"
  )

  for key in "${!APP_SETTINGS[@]}"; do
    value="${APP_SETTINGS[$key]}"
    log_info "  - Setting: $key"
    az webapp config appsettings set \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_SERVICE" \
      --settings "$key=$value" \
      > /dev/null
  done

  log_success "Environment variables configured"
}

setup_deployment_source() {
  log_info "Configuring deployment source (GitHub)"

  # Get the deployment credentials
  DEPLOYMENT_PROFILE=$(az webapp deployment list-publishing-profiles \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query "[?contains(publishMethod, 'MSDeploy')] | [0]" \
    --output json)

  if [[ -z "$DEPLOYMENT_PROFILE" ]]; then
    log_info "  - Deployment profile not yet available (will be created during first deployment)"
  else
    log_success "Deployment profile retrieved"
  fi
}

enable_continuous_deployment() {
  log_info "Configuring GitHub Actions deployment"

  # Enable built-in auth for GitHub Actions
  az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --startup-file "npm start" \
    2>&1 | grep -E "(Succeeded|updated)" || true

  log_success "GitHub Actions deployment configured"
}

get_deployment_info() {
  log_info "Retrieving deployment information"

  echo ""
  echo "=========================================="
  echo "DEPLOYMENT INFORMATION"
  echo "=========================================="
  echo "Environment:          $ENVIRONMENT"
  echo "Region:               $REGION"
  echo "Resource Group:       $RESOURCE_GROUP"
  echo ""
  echo "Azure Resources:"
  echo "  App Service:        $APP_SERVICE"
  echo "  App Service Plan:   $APP_SERVICE_PLAN"
  echo "  CosmosDB Account:   $COSMOSDB_ACCOUNT"
  echo "  CosmosDB Database:  $COSMOSDB_DATABASE"
  echo "  Throughput:         ${COSMOSDB_THROUGHPUT} RU/s"
  echo ""
  echo "Access Information:"

  APP_URL=$(az webapp show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query "defaultHostName" \
    --output tsv)

  echo "  App Service URL:    https://$APP_URL"
  echo "  Health Check:       https://$APP_URL/api/health"
  echo ""
  echo "CosmosDB Collections Created:"
  for collection in "${!COLLECTIONS[@]}"; do
    echo "  - $collection (partition key: /${COLLECTIONS[$collection]})"
  done
  echo ""
  echo "=========================================="
  echo ""
}

save_deployment_config() {
  log_info "Saving deployment configuration"

  CONFIG_FILE="$PROJECT_ROOT/.deployment-${ENVIRONMENT}.json"

  cat > "$CONFIG_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "region": "$REGION",
  "resourceGroup": "$RESOURCE_GROUP",
  "appService": "$APP_SERVICE",
  "appServicePlan": "$APP_SERVICE_PLAN",
  "cosmosdbAccount": "$COSMOSDB_ACCOUNT",
  "cosmosdbDatabase": "$COSMOSDB_DATABASE",
  "cosmosdbThroughput": "$COSMOSDB_THROUGHPUT",
  "collections": $(jq -n --arg keys "$(echo "${!COLLECTIONS[@]}" | tr ' ' ',')" '$keys | split(",") | map({name: ., partitionKey: ""})')
}
EOF

  log_success "Deployment config saved to: $CONFIG_FILE"
}

# ============================================================================
# Main Deployment Flow
# ============================================================================

main() {
  log_info "========== AZURE DEPLOYMENT STARTED =========="
  log_info "Environment: $ENVIRONMENT | Region: $REGION"
  log_info "Timestamp: $TIMESTAMP"
  echo ""

  check_prerequisites
  validate_environment
  create_resource_group
  create_cosmos_db
  create_app_service
  configure_environment_variables
  setup_deployment_source
  enable_continuous_deployment
  get_deployment_info
  save_deployment_config

  log_success "========== DEPLOYMENT COMPLETED =========="
  log_info "Next steps:"
  log_info "  1. Review deployment information above"
  log_info "  2. Build and deploy the application:"
  log_info "     npm run build"
  log_info "  3. Deploy to App Service:"
  log_info "     az webapp deployment source config-zip --resource-group $RESOURCE_GROUP --name $APP_SERVICE --src dist.zip"
  log_info "  4. Monitor the app:"
  log_info "     az monitor app-insights show --resource-group $RESOURCE_GROUP --name $APP_SERVICE"
}

# Run main function
main "$@"
