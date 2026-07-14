# Deployment Rollback Procedures

## Overview

This document outlines the procedures for rolling back deployments of the Bosch Internal Communications Platform (CGR MVP) in Azure environments.

## When to Rollback

Rollback should be initiated when:
- Deployment health checks fail after deployment
- Critical bugs are discovered in production
- Performance degradation is observed
- Security vulnerabilities are identified post-deployment
- API or database migration issues occur

## Azure Deployment Rollback Steps

### Manual Rollback via Azure Portal

1. **Access Azure Container Instances or App Service**
   - Navigate to Azure Portal
   - Select the appropriate resource group for the CGR MVP environment
   - Find the web or API container/app service

2. **Access Deployment History**
   - Click on "Deployments" in the resource menu
   - Review recent deployments and their timestamps
   - Identify the last known good deployment

3. **Redeploy Previous Version**
   ```bash
   # Option 1: Using Azure CLI
   az container create \
     --resource-group <resource-group> \
     --name cgr-mvp-web \
     --image <registry>/<image>:<previous-tag> \
     --registry-login-server <registry-url> \
     --registry-username <username> \
     --registry-password <password>
   ```

4. **Verify Rollback Success**
   - Check application health endpoints
   - Verify database connectivity
   - Test authentication flows
   - Monitor error logs and performance metrics

### Automated Rollback via GitHub Actions

When a deployment fails, the `azure-rollback` job automatically:

1. Triggers if the `deploy-azure` job fails
2. Identifies the previous successful deployment
3. Posts a notification in the associated PR or issue
4. Prepares environment for manual rollback execution

### CLI-Based Rollback

```bash
# List recent deployments
az container list \
  --resource-group cgr-mvp-prod \
  --query "[].{Name:name, Image:properties.containers[0].image}" \
  --output table

# Roll back to previous image version
az container update \
  --resource-group cgr-mvp-prod \
  --name cgr-mvp-web \
  --image <registry>/<image>:<previous-version-tag>
```

## Database Rollback Procedures

If the deployment includes database migrations:

1. **Review Migration History**
   ```bash
   npm run migration:status
   ```

2. **Revert Last Migration**
   ```bash
   npm run migration:down --steps=1
   ```

3. **Validate Database State**
   ```bash
   npm run database:validate
   ```

## Rollback Communication

When a rollback is executed:

1. Notify the team via Slack/Teams with status and affected services
2. Document the rollback reason in the deployment log
3. Create a post-mortem issue in GitHub
4. Update the deployment status in Azure DevOps (if integrated)

## Prevention and Testing

To reduce rollback frequency:

1. **Pre-Deployment Testing**
   - Run full test suite before deployment
   - Execute E2E tests in staging environment
   - Perform load testing on critical paths

2. **Canary Deployments**
   - Deploy to 5-10% of traffic first
   - Monitor error rates and latency
   - Gradually increase traffic if healthy

3. **Feature Flags**
   - Use feature flags for major changes
   - Enable gradual rollout of new functionality
   - Allow quick disable without redeployment

## Rollback Checklist

- [ ] Identified reason for rollback
- [ ] Confirmed previous deployment version
- [ ] Executed rollback procedure
- [ ] Verified application health
- [ ] Checked database integrity
- [ ] Tested critical user workflows
- [ ] Notified stakeholders
- [ ] Created post-mortem issue
- [ ] Determined root cause
- [ ] Implemented preventive measures

## Emergency Contacts

- **DevOps Lead**: [Contact information]
- **Team Slack Channel**: #cgr-mvp-deployments
- **Incident Commander**: [Contact information]

## Additional Resources

- [Azure Container Registry Documentation](https://docs.microsoft.com/en-us/azure/container-registry/)
- [GitHub Actions Deployment Guide](./DEPLOYMENT.md)
- [Database Migration Guide](./MIGRATIONS.md)
