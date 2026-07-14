#!/bin/bash

###############################################################################
# Deployment Validation Script
# Validates Azure deployment health and configuration
###############################################################################

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Resource names
RESOURCE_GROUP="cgr-${ENVIRONMENT}-rg"
APP_SERVICE="cgr-${ENVIRONMENT}-api"
COSMOSDB_ACCOUNT="cgr${ENVIRONMENT}db"
COSMOSDB_DATABASE="cgr_platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# ============================================================================
# Functions
# ============================================================================

log_pass() {
  echo -e "${GREEN}✓${NC} $*"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗${NC} $*"
  ((FAILED++))
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $*"
  ((WARNINGS++))
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  if command -v az &> /dev/null; then
    log_pass "Azure CLI installed"
  else
    log_fail "Azure CLI not found"
    return 1
  fi

  if az account show &> /dev/null; then
    log_pass "Azure authenticated"
  else
    log_fail "Not authenticated with Azure"
    return 1
  fi
}

check_resource_group() {
  log_info "Checking Resource Group..."

  if az group exists --name "$RESOURCE_GROUP" | grep -q true; then
    log_pass "Resource Group exists: $RESOURCE_GROUP"

    LOCATION=$(az group show --name "$RESOURCE_GROUP" --query "location" --output tsv)
    log_info "  Location: $LOCATION"
  else
    log_fail "Resource Group not found: $RESOURCE_GROUP"
    return 1
  fi
}

check_cosmosdb() {
  log_info "Checking CosmosDB..."

  if az cosmosdb show --resource-group "$RESOURCE_GROUP" --name "$COSMOSDB_ACCOUNT" &> /dev/null; then
    log_pass "CosmosDB account exists: $COSMOSDB_ACCOUNT"

    # Check account status
    STATUS=$(az cosmosdb show \
      --resource-group "$RESOURCE_GROUP" \
      --name "$COSMOSDB_ACCOUNT" \
      --query "provisioningState" \
      --output tsv)

    if [[ "$STATUS" == "Succeeded" ]]; then
      log_pass "  Provisioning Status: $STATUS"
    else
      log_warn "  Provisioning Status: $STATUS"
    fi

    # Check database
    if az cosmosdb sql database show \
      --resource-group "$RESOURCE_GROUP" \
      --account-name "$COSMOSDB_ACCOUNT" \
      --name "$COSMOSDB_DATABASE" &> /dev/null; then
      log_pass "Database exists: $COSMOSDB_DATABASE"

      # List collections
      log_info "  Collections:"
      COLLECTIONS=$(az cosmosdb sql container list \
        --resource-group "$RESOURCE_GROUP" \
        --account-name "$COSMOSDB_ACCOUNT" \
        --database-name "$COSMOSDB_DATABASE" \
        --query "[].name" \
        --output tsv)

      if [[ -z "$COLLECTIONS" ]]; then
        log_fail "    No collections found"
      else
        while IFS= read -r collection; do
          log_info "    - $collection"
        done <<< "$COLLECTIONS"
      fi
    else
      log_fail "Database not found: $COSMOSDB_DATABASE"
    fi
  else
    log_fail "CosmosDB account not found: $COSMOSDB_ACCOUNT"
  fi
}

check_app_service() {
  log_info "Checking App Service..."

  if az webapp show --resource-group "$RESOURCE_GROUP" --name "$APP_SERVICE" &> /dev/null; then
    log_pass "App Service exists: $APP_SERVICE"

    # Get App Service URL
    APP_URL=$(az webapp show \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_SERVICE" \
      --query "defaultHostName" \
      --output tsv)

    log_info "  URL: https://$APP_URL"

    # Check App Service state
    STATE=$(az webapp show \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_SERVICE" \
      --query "state" \
      --output tsv)

    if [[ "$STATE" == "Running" ]]; then
      log_pass "  State: $STATE"
    else
      log_warn "  State: $STATE"
    fi

    # Check health check configuration
    HEALTH_CHECK=$(az webapp config show \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_SERVICE" \
      --query "healthCheckPath" \
      --output tsv)

    if [[ -n "$HEALTH_CHECK" && "$HEALTH_CHECK" != "null" ]]; then
      log_pass "  Health Check: $HEALTH_CHECK"
    else
      log_warn "  Health Check not configured"
    fi

    # Check App Service settings
    log_info "  Environment Variables:"
    SETTINGS=$(az webapp config appsettings list \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_SERVICE" \
      --query "[].name" \
      --output tsv)

    REQUIRED_VARS=(
      "COSMOSDB_CONNECTION_STRING"
      "COSMOSDB_DATABASE"
      "ENVIRONMENT"
      "NODE_ENV"
      "JWT_SECRET"
    )

    for var in "${REQUIRED_VARS[@]}"; do
      if echo "$SETTINGS" | grep -q "^$var$"; then
        log_pass "    - $var"
      else
        log_fail "    - $var (missing)"
      fi
    done
  else
    log_fail "App Service not found: $APP_SERVICE"
  fi
}

test_health_endpoints() {
  log_info "Testing Health Endpoints..."

  # Get App URL
  APP_URL=$(az webapp show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query "defaultHostName" \
    --output tsv 2> /dev/null || echo "")

  if [[ -z "$APP_URL" ]]; then
    log_warn "Could not retrieve App Service URL"
    return
  fi

  HEALTH_URL="https://$APP_URL/api/health"

  # Wait for app to be ready
  log_info "  Waiting for App Service to be ready (max 30s)..."
  for i in {1..6}; do
    if curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
      log_pass "  Basic health endpoint responding"
      break
    fi
    if [[ $i -lt 6 ]]; then
      sleep 5
    else
      log_warn "  Health endpoint not responding after 30s"
    fi
  done

  # Test individual endpoints
  for endpoint in "live" "ready" "detailed"; do
    ENDPOINT_URL="$HEALTH_URL/$endpoint"
    if curl -s -f "$ENDPOINT_URL" > /dev/null 2>&1; then
      log_pass "  /api/health/$endpoint responding"
    else
      log_warn "  /api/health/$endpoint not responding"
    fi
  done
}

check_environment_variables() {
  log_info "Checking Environment Variables..."

  # Check COSMOSDB_CONNECTION_STRING is set (but don't display value)
  if az webapp config appsettings list \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_SERVICE" \
    --query "[?name=='COSMOSDB_CONNECTION_STRING']" \
    --output tsv | grep -q "COSMOSDB_CONNECTION_STRING"; then
    log_pass "COSMOSDB_CONNECTION_STRING is set"
  else
    log_fail "COSMOSDB_CONNECTION_STRING not set"
  fi

  # Check other important settings
  for var in COSMOSDB_DATABASE ENVIRONMENT NODE_ENV JWT_SECRET; do
    VALUE=$(az webapp config appsettings list \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_SERVICE" \
      --query "[?name=='$var'].value" \
      --output tsv 2> /dev/null || echo "")

    if [[ -n "$VALUE" ]]; then
      log_pass "$var is set"
    else
      log_fail "$var is not set"
    fi
  done
}

check_cosmosdb_collections() {
  log_info "Checking CosmosDB Collections..."

  EXPECTED_COLLECTIONS=(
    "posts"
    "comments"
    "reactions"
    "users"
    "approvals"
    "audit_logs"
    "analytics"
  )

  ACTUAL_COLLECTIONS=$(az cosmosdb sql container list \
    --resource-group "$RESOURCE_GROUP" \
    --account-name "$COSMOSDB_ACCOUNT" \
    --database-name "$COSMOSDB_DATABASE" \
    --query "[].name" \
    --output tsv 2> /dev/null || echo "")

  for collection in "${EXPECTED_COLLECTIONS[@]}"; do
    if echo "$ACTUAL_COLLECTIONS" | grep -q "^$collection$"; then
      log_pass "  Collection exists: $collection"
    else
      log_fail "  Collection missing: $collection"
    fi
  done
}

generate_summary() {
  echo ""
  echo "=========================================="
  echo "VALIDATION SUMMARY"
  echo "=========================================="
  echo "Environment: $ENVIRONMENT"
  echo "Resource Group: $RESOURCE_GROUP"
  echo ""
  echo -e "${GREEN}Passed:${NC}   $PASSED"
  echo -e "${RED}Failed:${NC}   $FAILED"
  echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
  echo ""

  if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "=========================================="
    return 0
  else
    echo -e "${RED}✗ Some checks failed. Please review above.${NC}"
    echo "=========================================="
    return 1
  fi
}

# ============================================================================
# Main
# ============================================================================

main() {
  log_info "========== DEPLOYMENT VALIDATION =========="
  log_info "Environment: $ENVIRONMENT"
  echo ""

  check_prerequisites || return 1
  echo ""

  check_resource_group || return 1
  echo ""

  check_cosmosdb
  echo ""

  check_app_service
  echo ""

  check_environment_variables
  echo ""

  check_cosmosdb_collections
  echo ""

  test_health_endpoints
  echo ""

  generate_summary
}

main "$@"
