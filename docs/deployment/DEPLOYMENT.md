# Azure Deployment Guide

## Overview

This guide covers the deployment of the CGR MVP (Bosch Internal Communications Platform) to Azure environments using GitHub Actions and Azure Container Registry.

## Prerequisites

- GitHub repository with Actions enabled
- Azure subscription with Container Registry
- Azure Service Principal credentials configured as GitHub secrets
- Docker installed locally for testing images

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings > Secrets and variables > Actions):

### Required Secrets

1. **AZURE_CREDENTIALS** (JSON format)
   ```json
   {
     "clientId": "<service-principal-client-id>",
     "clientSecret": "<service-principal-client-secret>",
     "subscriptionId": "<azure-subscription-id>",
     "tenantId": "<azure-tenant-id>"
   }
   ```

2. **AZURE_REGISTRY_NAME**
   - Container Registry name (without .azurecr.io)

3. **AZURE_REGISTRY_URL**
   - Full registry URL: `<registry-name>.azurecr.io`

4. **AZURE_REGISTRY_USERNAME**
   - Service Principal username or admin account

5. **AZURE_REGISTRY_PASSWORD**
   - Service Principal password or admin account password

## Deployment Trigger

Deployments are automatically triggered when:
- Code is pushed to the `main` branch
- All CI checks pass (unit tests, E2E tests, security scans)
- GitHub environment protection rules are satisfied

## Deployment Stages

### 1. Pre-Deployment

- Unit tests pass (Node.js 18.x and 20.x)
- E2E tests with Playwright pass
- Security vulnerabilities are cleared
- Code coverage requirements met

### 2. Build Stage

- Application bundles built with optimal configuration
- Artifacts prepared for containerization
- Docker image tagged with git SHA

### 3. Push to Registry

- Image pushed to Azure Container Registry
- Image tagged with:
  - Git commit SHA: `cgr-mvp:abc1234`
  - Latest: `cgr-mvp:latest`
  - Branch: `cgr-mvp:main`

### 4. Deploy to Azure

- Container instances updated with new image
- Health checks verified
- Deployment status recorded

## Local Deployment Testing

### Build Docker Image

```bash
# Build the Docker image
docker build -t cgr-mvp:test .

# Run locally
docker run -p 3000:3000 -e NODE_ENV=production cgr-mvp:test
```

### Push to Azure Registry

```bash
# Login to Azure
az acr login --name <registry-name>

# Tag image
docker tag cgr-mvp:test <registry>.azurecr.io/cgr-mvp:test

# Push image
docker push <registry>.azurecr.io/cgr-mvp:test
```

## Environment Variables

Set these in your Azure App Service or Container Instance:

```
NODE_ENV=production
LOG_LEVEL=info
AZURE_CLIENT_ID=<from-keyvault>
AZURE_CLIENT_SECRET=<from-keyvault>
DATABASE_URL=<connection-string>
API_BASE_URL=https://cgr-mvp-api.azurewebsites.net
```

## Monitoring Post-Deployment

### Azure Metrics to Monitor

1. **Application Metrics**
   - CPU Usage
   - Memory Usage
   - Request Count
   - Error Rate
   - Response Time

2. **Database Metrics**
   - Connection Count
   - Query Performance
   - Storage Usage

3. **Container Metrics**
   - Image Pull Time
   - Container Startup Time
   - Network I/O

### Health Check Endpoints

Configure health checks to monitor:

```
GET /health - Basic health check
GET /health/ready - Readiness probe
GET /health/live - Liveness probe
```

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Review Azure Container Registry for build errors
3. Verify Azure credentials and permissions
4. Check resource quotas in Azure subscription

### Application Won't Start

1. Review container logs: `az container logs --resource-group <rg> --name <container>`
2. Check environment variables are set
3. Verify database connectivity
4. Review application startup logs

### Performance Issues

1. Check resource allocation (CPU/memory)
2. Review database slow query logs
3. Monitor network connectivity
4. Verify API rate limiting

## Rollback Procedures

See [ROLLBACK.md](./ROLLBACK.md) for detailed rollback instructions.

## Advanced Configuration

### Blue-Green Deployment

For zero-downtime deployments:

1. Deploy to secondary resource
2. Verify health and performance
3. Switch traffic via Azure Load Balancer
4. Keep old deployment for quick rollback

### Canary Deployments

Gradually roll out changes:

1. Deploy to 10% of traffic
2. Monitor for issues (15 minutes)
3. Increase to 50% of traffic
4. Monitor (15 minutes)
5. Increase to 100% of traffic

### Scheduled Deployments

Deploy during low-traffic periods:

1. Configure GitHub Actions schedule
2. Set deployment window (e.g., Tuesday 2:00 AM UTC)
3. Include maintenance window notification

## Security Best Practices

1. **Secret Management**
   - Store secrets in GitHub Secrets
   - Use Azure Key Vault for sensitive values
   - Rotate credentials regularly

2. **Image Security**
   - Scan images for vulnerabilities
   - Use minimal base images
   - Sign container images

3. **Access Control**
   - Limit deployment permissions
   - Use separate credentials per environment
   - Audit deployment activities

## CI/CD Pipeline

The GitHub Actions workflow includes:

1. **Test Job** - Unit tests on Node 18.x and 20.x
2. **E2E Tests Job** - Playwright tests for user workflows
3. **Security Job** - Trivy vulnerability scanning
4. **Dependency Check** - npm audit and dependency updates
5. **Deploy Job** - Builds and pushes to Azure
6. **Rollback Job** - Handles failed deployments

## Performance Optimization

1. **Build Optimization**
   - Enable npm cache in Actions
   - Use --legacy-peer-deps for faster installs
   - Minimize image size with multi-stage builds

2. **Runtime Optimization**
   - Set appropriate resource limits
   - Configure auto-scaling based on metrics
   - Enable compression for API responses

## Support and Escalation

For deployment issues:

1. Check CI/CD pipeline logs
2. Review Azure resource metrics
3. Contact DevOps team
4. Escalate critical production issues
