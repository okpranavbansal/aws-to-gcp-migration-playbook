# IAM Comparison: AWS ecsTaskExecutionRole vs GCP Workload Identity

## AWS: ecsTaskExecutionRole

```hcl
module "iam_assumable_role_custom" {
  source = "terraform-aws-modules/iam/aws//modules/iam-assumable-role"

  role_name             = "ecsTaskExecutionRole"
  role_requires_mfa     = false
  trusted_role_services = ["ecs-tasks.amazonaws.com"]

  custom_role_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    aws_iam_policy.container_policy.arn,
    aws_iam_policy.storage_policy.arn,
    aws_iam_policy.security_policy.arn,
  ]
}
```

**Problems:**
- One role shared across all services in the cluster
- Overly broad: any task can write to any S3 bucket
- Manual rotation if role ARN changes

---

## GCP: Workload Identity

```yaml
# Kubernetes ServiceAccount (in cluster)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: copilot-sa
  namespace: prd-copilot
  annotations:
    iam.gke.io/gcp-service-account: copilot-gke@prj-acme-prd.iam.gserviceaccount.com
```

```hcl
# GCP Service Account (Terraform)
resource "google_service_account" "copilot_gke" {
  account_id   = "copilot-gke"
  display_name = "GKE copilot workload identity SA"
  project      = "prj-acme-prd"
}

# Bind KSA → GSA
resource "google_service_account_iam_binding" "workload_identity" {
  service_account_id = google_service_account.copilot_gke.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "serviceAccount:prj-acme-prd.svc.id.goog[prd-copilot/copilot-sa]"
  ]
}

# Grant only the permissions this environment needs
resource "google_project_iam_member" "storage_reader" {
  project = "prj-acme-prd"
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.copilot_gke.email}"
}
```

**Benefits:**
- Namespace-scoped: prd-copilot SA ≠ stg-copilot SA (blast radius isolated per env)
- No credentials to rotate; GKE metadata server handles token exchange
- Least-privilege enforced from day 1 (role per resource type, not wildcard)

---

## Side-by-Side

| | AWS ecsTaskExecutionRole | GCP Workload Identity |
|--|--------------------------|----------------------|
| Scope | Cluster-wide (all tasks) | Namespace-scoped per env |
| Rotation | Manual (update task def) | Automatic (metadata server) |
| Least privilege | Hard to enforce (managed policies) | Native (per-resource IAM binding) |
| Audit | CloudTrail | Cloud Audit Logs |
| GitOps | Role ARN in task JSON | SA annotation in Kubernetes manifest |
| Drift detection | None | ArgoCD |
