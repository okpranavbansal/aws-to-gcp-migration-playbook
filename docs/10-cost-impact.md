# 10 — Cost Impact

## Summary

| Metric | AWS (ECS) | GCP (GKE) | Change |
|--------|-----------|-----------|--------|
| Monthly compute | ~$8,400 | ~$3,200 | -62% |
| Load balancer | ~$320 (3 ALBs) | ~$180 (1 Gateway) | -44% |
| Container registry storage | ~$140 (37 ECR repos) | ~$60 (Artifact Registry) | -57% |
| Logging (CloudWatch vs Cloud Logging) | ~$380 | ~$210 | -45% |
| Total infra | ~$9,240/mo | ~$3,650/mo | **-60%** |

> Numbers are sanitized approximations representing the category of savings achieved. Actual figures depend on region, instance family, and traffic patterns.

---

## Compute Savings Breakdown

### AWS: ECS Fargate Spot (50/50)

- Fargate Spot pricing: ~$0.01264/vCPU-hr, ~$0.00139/GB-hr
- 37 services × average 0.5 vCPU × 1GB = ~18.5 vCPU, ~37 GB running continuously
- With 50% Spot: effective rate ~75% of On-Demand
- Monthly: ~$8,400

### GCP: GKE Autopilot + Spot Pods

- GKE Autopilot Spot pricing: ~$0.00839/vCPU-hr, ~$0.00112/GB-hr
- Same workload: ~18.5 vCPU, ~37 GB
- Bin-packing efficiency: ~85% utilization (vs ~60% on Fargate where each task is isolated)
- Monthly: ~$3,200

**Key driver:** Autopilot Spot + bin-packing vs Fargate's per-task isolation is the primary cost lever. Kubernetes packs multiple containers per node; Fargate charges per-task regardless of bin-packing.

---

## Additional Savings Tactics

### 1. Single ClickHouse for STG + UAT

Instead of two ClickHouse instances (one per env), UAT routes to STG ClickHouse via `ReferenceGrant`. This saved ~$180/mo (pd-ssd PVC + compute).

### 2. ECR → Artifact Registry consolidation

37 ECR repos became a single Artifact Registry repository with path-based image separation. Lifecycle policies (delete untagged after 7 days) reduced storage costs.

### 3. Log retention tuning

- ECS: CloudWatch log groups had no retention set → logs accumulate indefinitely
- After: retention set to 1 day for debug logs, 7 days for access logs, 30 days for audit
- Monthly CW savings: ~$180

### 4. ALB consolidation

3 ALBs (prd, stg, uat) → 1 GKE Gateway (each ALB has a fixed hourly cost + LCU charges). Gateway API with a single external IP serves all environments via host-based routing.

---

## What Did Not Save Money

- **Confluent Cloud Kafka:** Stayed on AWS, same cost (~$600/mo). Migration risk + data egress cost outweighed any savings.
- **Neo4j EC2 ASG:** Stayed on AWS. The ASG with a dedicated EBS volume is cost-efficient; moving to GKE would require a CSI driver and more complex StatefulSet management.
- **Route53:** 48 hosted zones × $0.50/zone = $24/mo. Kept on AWS; no reason to migrate DNS.
- **RDS MySQL:** Kept on AWS with read replica. Cloud SQL equivalent would not save money at this scale.

---

## ROI Timeline

- **Migration effort:** ~3 months of 2 SREs
- **Monthly savings:** ~$5,590
- **Break-even:** < 2 months after migration completed
