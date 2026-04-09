# 01 — Why We Migrated from AWS ECS to GKE

## Context

We ran a B2B SaaS platform (AI-driven sales intelligence) on AWS ECS Fargate across 4 clusters and 37 services for 2+ years. The platform grew organically — each team added services, task definitions, and manual scripts. By late 2024 we hit compounding operational debt.

---

## The Problems with ECS at Scale

### 1. Task Definition JSON sprawl

Every service had a `task-definition.json` in `ecs/services/<region>/<cluster>/<service>/`. With 37 services × 3 environments = **111 JSON files** to keep in sync. When a security patch required updating the base image tag, it meant 37 PRs or a fragile loop script.

### 2. No GitOps or drift detection

Deployments ran via `registerTask.sh` + `aws ecs update-service`. If someone updated a task definition in the console (not uncommon at 2am during an incident), the Git state drifted silently. There was no automated reconciliation.

### 3. ECS service discovery friction

AWS Cloud Map worked, but gRPC services (e.g. `azmuth`) required specific target group types and health check paths (`/llm.v1.HealthService/Check`). ALB rules grew into hundreds of listener rules per environment.

### 4. Secrets management

SSM Parameter Store per service meant IAM policies listing individual parameter ARNs. Rotating a secret required updating 4-5 places (SSM, IAM policy, task def env var, any consumers).

### 5. Cost structure

ECS Fargate pricing is per vCPU/memory-second. Fargate Spot helped (50/50 split) but task interruptions on Spot with no graceful drain logic caused periodic 5xx spikes. GKE Spot Pods with PodDisruptionBudgets gave more controlled preemption.

---

## Alternatives Considered

| Option | Verdict |
|--------|---------|
| Stay on ECS + fix tooling | Incremental: worth doing if GCP wasn't already used for other services |
| Migrate to EKS | Possible, but management overhead of control plane + node groups didn't justify vs GKE Autopilot |
| Migrate to GKE | Selected: GCP was already used for analytics workloads; Autopilot eliminates node management |
| Go fully serverless (Lambda + API Gateway) | Architecture mismatch: most services are long-lived gRPC/HTTP with stateful connections |

---

## Decision Criteria

1. **GitOps first** — every deployment must be auditable via Git history
2. **Secrets in Git** (encrypted) — no external secret store dependency for disaster recovery
3. **Multi-environment parity** — stg/uat/prd must use identical manifests with only image tags and env vars differing
4. **Zero-downtime migration** — run both platforms in parallel during migration; use CloudFront/ALB to shift traffic
5. **Maintain Confluent Cloud** — Kafka cluster stays on AWS (migration risk outweighs benefit; data in Confluent is not compute)

---

## Timeline

See [migration-timeline.md](../diagrams/migration-timeline.md) for the full Gantt diagram.

**High-level phases:**
1. **Phase 0 (2 weeks):** GKE cluster provisioning, ArgoCD bootstrap, SOPS setup
2. **Phase 1 (4 weeks):** Stateless services migrated (no DB writes during migration window)
3. **Phase 2 (3 weeks):** Stateful services + ClickHouse (StatefulSet with pd-ssd)
4. **Phase 3 (2 weeks):** Traffic cut-over (ALB → GKE Gateway), ECS decommission
5. **Phase 4 (ongoing):** Hardening (see BETTERMENT backlog)
