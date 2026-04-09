# 07 — GitOps with ArgoCD: From ECS Scripts to ApplicationSet

## Before: Manual ECS Deployments

On ECS, deployments worked like this:

```bash
# Register updated task definition
./ecs/tasks/registerTask.sh --env prd --service billing-service

# Trigger ECS service update
aws ecs update-service \
  --cluster prd-platform \
  --service billing-service \
  --force-new-deployment
```

This required:
1. Correct AWS credentials on the deploying machine
2. SSH or CI runner access to the `iac-aws` repo
3. Manual verification that the new task came up healthy
4. No automatic rollback if health checks failed

**Result:** deployments worked but left no auditable trail in Git. Console edits were invisible.

---

## After: ArgoCD ApplicationSet

A single `ApplicationSet` CRD replaces all 37 ECS service deployment scripts. ArgoCD watches the Git repo and automatically applies any change to the matching namespace.

```yaml
# infrastructure/argocd/resources/prd/applicationset.yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: copilot-apps-prd
  namespace: argocd
spec:
  generators:
    - git:
        directories:
          - path: apps/*/overlays/prd
        repoURL: https://github.com/acme-org/iac-gcp.git
        revision: main
  goTemplate: true
  template:
    metadata:
      name: '{{ index (splitList "/" .path.path) 3 }}-{{ index (splitList "/" .path.path) 1 }}'
      finalizers:
        - resources-finalizer.argocd.argoproj.io/background
      annotations:
        argocd.argoproj.io/sync-wave: "10"
    spec:
      destination:
        namespace: '{{ index (splitList "/" .path.path) 3 }}-copilot'
        server: https://kubernetes.default.svc
      project: copilot
      source:
        path: "{{ .path.path }}"
        repoURL: https://github.com/acme-org/iac-gcp.git
        targetRevision: main
        plugin:
          name: ksops          # SOPS-encrypted secrets decrypted at sync time
      syncPolicy:
        automated:
          prune: true
          selfHeal: true       # auto-revert console changes
        retry:
          backoff:
            duration: 5s
            factor: 2
            maxDuration: 3m
          limit: 5
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
          - PruneLast=true
```

### How it works

1. Developer merges a PR updating `apps/billing-service/overlays/prd/deployment.yaml`
2. ArgoCD detects the diff within ~30 seconds (webhook or poll)
3. KSOPS plugin decrypts `config.env` (SOPS-encrypted, Age key stored in Kubernetes Secret)
4. ArgoCD applies the manifests with `kubectl apply --server-side`
5. ArgoCD monitors rollout; if pods fail to become Ready, sync status shows `Degraded`
6. `selfHeal: true` means manual `kubectl` edits to the cluster are automatically reverted

---

## SOPS + KSOPS Setup

Secrets live in Git, encrypted with SOPS:

```yaml
# apps/billing-service/overlays/prd/secret-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: billing-service-secret-generator
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - ./config.env
```

```bash
# .sops.yaml — defines which key encrypts which path
creation_rules:
  - path_regex: apps/.*/overlays/prd/.*\.env
    age: age1acme0000000000000000000000000000000000000000000000000000prd
  - path_regex: apps/.*/overlays/stg/.*\.env
    age: age1acme0000000000000000000000000000000000000000000000000000stg
```

**Key benefits:**
- Secrets are version-controlled (encrypted)
- No dependency on Vault, SSM, or Secret Manager for basic secret delivery
- Decryption key is mounted on ArgoCD repo-server as a Kubernetes Secret

---

## Sync Wave Strategy

```
Wave 0:  Namespace + ServiceAccount + Gateway (networking.gke.io infra)
Wave 1:  Databases (ClickHouse StatefulSet)
Wave 5:  Datastores consumers (Redis, Kafka consumers)
Wave 10: Application services (all 23 workloads)
Wave 20: Ingress routes (HTTPRoutes, GCPBackendPolicy)
```

Controlled via annotation: `argocd.argoproj.io/sync-wave: "10"`

---

## Deployment Workflow Comparison

| Step | ECS (before) | GKE + ArgoCD (after) |
|------|-------------|----------------------|
| Trigger deploy | Run `registerTask.sh` manually | Push to `main` branch |
| Secret injection | SSM Parameter Store at task start | SOPS-encrypted in Git, KSOPS at sync |
| Rollback | Re-register previous task definition | `git revert` + push (or ArgoCD UI) |
| Drift detection | None | ArgoCD `selfHeal: true` |
| Audit trail | CloudTrail (not Git) | Git blame + PR history |
| Multi-env parity | Separate JSON per env | Kustomize base + overlays |
