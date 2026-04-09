# 09 — What Broke (And How We Fixed It)

Real production issues encountered during the AWS → GCP migration. No sugar-coating.

---

## Issue 1: NEG Annotation Drift (ArgoCD false positives)

**What happened:** Every ArgoCD sync flagged every Service as `OutOfSync`. The diff showed GKE-injected annotations (`cloud.google.com/neg`, `cloud.google.com/neg-status`) that don't exist in Git.

**Root cause:** GKE automatically adds NEG annotations to Services when the Gateway API backend policy is applied. These annotations change dynamically as NEGs are created in each zone.

**Fix:**
```yaml
# applicationset.yaml — add to ignoreDifferences
ignoreDifferences:
  - group: ""
    kind: Service
    jsonPointers:
      - /metadata/annotations/cloud.google.com~1neg
      - /metadata/annotations/cloud.google.com~1neg-status
```

**Lesson:** Always add GKE-managed annotations to ArgoCD `ignoreDifferences` from day one.

---

## Issue 2: `ephemeral-storage` Resource Requests Injected by GKE

**What happened:** GKE Autopilot automatically injects `resources.requests.ephemeral-storage` and `resources.limits.ephemeral-storage` into every container spec. ArgoCD treated these as drift.

**Fix:**
```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jqPathExpressions:
      - .spec.template.spec.containers[].resources.requests."ephemeral-storage"
      - .spec.template.spec.containers[].resources.limits."ephemeral-storage"
```

---

## Issue 3: SOPS Bootstrap Chicken-and-Egg

**What happened:** KSOPS plugin on the ArgoCD repo-server needs the Age decryption key as a Kubernetes Secret. But ArgoCD itself is deployed via Kustomize from the same repo. So: can't sync the repo without the key, can't bootstrap without ArgoCD running.

**Fix:** Manual bootstrap script that runs before ArgoCD is deployed:

```bash
# infrastructure/argocd/bootstrap/bootstrap.sh (simplified)
# 1. Create the age key secret manually
kubectl create secret generic ksops-age-key \
  --from-literal=age-key.txt="AGE-SECRET-KEY-..." \
  -n argocd

# 2. Apply ArgoCD with server-side apply
kubectl apply -k infrastructure/argocd/base --server-side

# 3. Wait for ArgoCD to be ready, then apply the ApplicationSet
kubectl apply -k infrastructure/argocd/overlays/prd --server-side
```

**Lesson:** Document the bootstrap sequence explicitly. The first apply is always manual; subsequent changes are GitOps.

---

## Issue 4: ClickHouse StatefulSet PVC Deletion on Kustomize Apply

**What happened:** During a Kustomize overlay update that changed the StatefulSet `volumeClaimTemplates`, `kubectl apply` failed silently. The StatefulSet was not updated (Kubernetes does not allow `volumeClaimTemplates` mutation). ArgoCD showed `Synced` but the old spec was still running.

**Fix:** Use `ServerSideApply=true` which gives a clearer error, then manually delete and recreate the StatefulSet (with data preserved via `reclaimPolicy: Retain` on the StorageClass).

```yaml
# apps/clickhouse/base/storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: retain-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Retain           # PVC deletion does NOT delete the PD
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

**Lesson:** Always use `reclaimPolicy: Retain` for stateful workloads in production.

---

## Issue 5: Reloader Not Restarting Pods on Secret Changes

**What happened:** After updating a SOPS-encrypted `config.env` and syncing via ArgoCD, the running pods did not restart. The new secret values were not picked up.

**Root cause:** Kubernetes Secrets are not hot-reloaded into running pods. Stakater Reloader watches ConfigMap/Secret annotations, but it needs an annotation on the Deployment.

**Fix:** Add annotation to each Deployment:
```yaml
metadata:
  annotations:
    reloader.stakater.com/auto: "true"
```

And add `reloader.stakater.com/last-reloaded-from` to ArgoCD `ignoreDifferences` (Reloader writes this annotation dynamically).

---

## Issue 6: Cross-Namespace HTTPRoute to STG ClickHouse from UAT

**What happened:** UAT namespace (`uat-copilot`) needed to reach the STG ClickHouse (`stg-copilot` namespace) because we run a shared ClickHouse for cost saving. Gateway API blocks cross-namespace backend references by default.

**Fix:** `ReferenceGrant` in the target namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-uat-to-stg-clickhouse
  namespace: stg-copilot
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: uat-copilot
  to:
    - group: ""
      kind: Service
      name: clickhouse
```

---

## Issue 7: Fargate Spot Interruptions Causing 5xx Spikes

**What happened (on AWS side):** With 50% FARGATE_SPOT capacity weight, Spot interruptions would kill tasks before the ECS service could schedule replacements. ALB target groups had a 300s deregistration delay which caused in-flight requests to hang.

**Fix on ECS:**
- Reduce deregistration delay to 30s for stateless services
- Add `SIGTERM` handler in applications to drain connections gracefully
- Use `minimumHealthyPercent: 100` on all services to ensure replacements before termination

**GKE equivalent:** PodDisruptionBudgets + preStop lifecycle hook.
