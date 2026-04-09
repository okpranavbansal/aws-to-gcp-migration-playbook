# 03 — IAM Mapping: AWS → GCP

One of the most important (and underestimated) parts of a cloud migration is translating IAM models. AWS and GCP take fundamentally different approaches.

---

## The AWS Model

On ECS Fargate, every task gets an **IAM Task Execution Role**. A single role (`ecsTaskExecutionRole`) was shared across most services, carrying broad managed policies:

```hcl
# Sanitized from real production code
module "iam_assumable_role_custom" {
  source = "terraform-aws-modules/iam/aws//modules/iam-assumable-role"

  role_name             = "ecsTaskExecutionRole"
  role_requires_mfa     = false
  trusted_role_services = ["ecs-tasks.amazonaws.com"]

  custom_role_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
    "arn:aws:iam::aws:policy/CloudFrontFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    # custom policies for ECR, CloudWatch, KMS
  ]
}
```

**Problem:** overly broad permissions. Any task in the cluster could read any S3 bucket or push CloudFront invalidations. This was a known debt item.

---

## The GCP Model: Workload Identity

GKE uses **Workload Identity** (WI): a Kubernetes ServiceAccount (KSA) is annotated to impersonate a GCP IAM Service Account (GSA). The binding is namespace-scoped, so each environment (`stg-copilot`, `uat-copilot`, `prd-copilot`) has its own SA.

```yaml
# infrastructure/overlays/prd/serviceaccounts/copilot-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: copilot-sa
  namespace: prd-copilot
  annotations:
    iam.gke.io/gcp-service-account: copilot-gke@prj-acme-prd.iam.gserviceaccount.com
```

```hcl
# Terraform: bind KSA to GSA
resource "google_service_account_iam_binding" "workload_identity" {
  service_account_id = google_service_account.copilot_gke.name
  role               = "roles/iam.workloadIdentityUser"
  members = [
    "serviceAccount:prj-acme-prd.svc.id.goog[prd-copilot/copilot-sa]"
  ]
}
```

---

## Comparison Table

| Concern | AWS ECS | GCP GKE |
|---------|---------|---------|
| Identity unit | IAM Role per task family | Kubernetes SA per namespace |
| Scope | Account-wide (can be broad) | Namespace-scoped (environment isolation built-in) |
| Rotation | Role ARN updated in task def | Automatic via GKE metadata server |
| Secret access | SSM Parameter Store via IAM | Secret Manager IAM binding on GSA |
| Cross-service calls | IAM policies on SNS/SQS/S3 | IAM bindings on GCP resources |
| Audit | CloudTrail | Cloud Audit Logs |
| Drift risk | Task def may reference stale role | ArgoCD detects SA drift |

---

## Migration Steps

1. Create one GSA per environment in GCP (`copilot-gke@prj-acme-{stg,prd}`)
2. Grant only the permissions each environment needs (least-privilege from day 1)
3. Annotate KSA with `iam.gke.io/gcp-service-account`
4. Test: `kubectl exec` into a pod and verify `gcloud auth list` shows the expected identity
5. Remove SSM access from AWS role for services that have migrated (reduce blast radius)

---

## Bedrock / AI Services (AWS-side)

LLM inference services retained an AWS IAM group with `AmazonBedrockFullAccess` for the CI/CD deploy user. These services call Bedrock from within GKE by mounting AWS credentials as a Kubernetes Secret (temporary; long-term target is Bedrock cross-account role with GKE OIDC federation).

```hcl
module "cicd" {
  source = "terraform-aws-modules/iam/aws//modules/iam-group-with-policies"
  name   = "cicd"
  custom_group_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
    "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    # ...
  ]
}
```
