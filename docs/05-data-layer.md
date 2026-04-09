# 05 — Data Layer: What Moved, What Stayed

## Decision Framework

For each data store, we evaluated:
1. **Migration risk** — can we do it zero-downtime? What's the rollback plan?
2. **Cost delta** — does GCP equivalent save money?
3. **Operational complexity** — is GCP's managed service actually simpler?

---

## RDS MySQL — Stayed on AWS

**Decision: Keep on AWS**

| Factor | Assessment |
|--------|-----------|
| Migration risk | High — live database, zero-downtime requires DMS or replication lag tolerance |
| Cost delta | Negligible — Cloud SQL equivalent pricing is similar |
| Complexity | Cloud SQL + Cloud SQL Proxy adds latency from GKE (cross-cloud) |

**How GKE services connect:** Cloud SQL Proxy sidecar was considered but rejected. Instead, services connect to RDS over the public endpoint with SSL (`sslmode=require`). The latency (GKE asia-southeast1 → RDS ap-southeast-1) is acceptable (< 5ms intra-region). The connection string is stored as a SOPS-encrypted secret in Git.

---

## ElastiCache Redis — Stayed on AWS

**Decision: Keep on AWS**

Redis is used for session storage and short-lived caches. Migration was deprioritized because:
- Redis data is ephemeral (sessions expire; caches rebuild)
- Memorystore Redis (GCP) is not materially cheaper
- Migration window for session stores risks user logouts at scale

GKE services connect via the existing private endpoint URL.

---

## Neo4j — Stayed on AWS

**Decision: Keep on AWS (EC2 ASG)**

```hcl
# Neo4j runs on EC2 with dedicated 100GB gp3 data volume
# ASG: min=0, max=1, desired=1
# Key pattern: data volume has delete_on_termination=false
block_device_mappings = [
  {
    device_name = "/dev/sdf"
    ebs = { volume_size = 100, volume_type = "gp3", delete_on_termination = false }
  }
]
```

Moving Neo4j to GKE as a StatefulSet was scoped and rejected:
- Neo4j does not have a production-ready GKE operator at the time of migration
- The EC2 ASG pattern is well-understood and stable
- SSM-based access works fine from GKE (cross-cloud over internet with TLS)

---

## ClickHouse — Migrated to GKE StatefulSet

**Decision: Migrate to GKE**

ClickHouse was self-managed on EC2. Moving to GKE StatefulSet gave:
- No EC2 reservation overhead
- Kubernetes-native health checks and restarts
- `pd-ssd` persistent disk with `reclaimPolicy: Retain` (safe against accidental deletion)

```yaml
# apps/clickhouse/base/storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: retain-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Retain               # PVC deletion does NOT delete the disk
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

**STG + UAT share one ClickHouse instance** to save cost (a `ReferenceGrant` allows UAT `HTTPRoute` to reference the STG ClickHouse `Service`).

**Migration steps:**
1. Backup ClickHouse data to S3 using `clickhouse-backup`
2. Create StatefulSet on GKE with same schema
3. Restore from backup
4. Point application config to new GKE service endpoint
5. Run read queries on both to verify data parity
6. Decommission EC2 instance

---

## Confluent Cloud Kafka — Stayed on AWS

**Decision: Keep on AWS (Confluent Cloud)**

Confluent Cloud is a managed service running on AWS infrastructure. It is not tied to EC2 or ECS — it's already cloud-native. There is no GCP equivalent that matches Confluent's managed experience, and migration would require:
- Topic data migration (Confluent Replicator or MirrorMaker2)
- Consumer group offset migration
- Reconfiguration of all producer/consumer connection strings

**No benefit justifies this risk.** GKE services connect to Confluent exactly as ECS services did — via the Confluent bootstrap server URL with SASL/SSL.

---

## S3 — Stayed on AWS

Static assets, pensieve documents, migration data, and backups remain in S3. GKE services access S3 directly using the `deploy.user` IAM credentials (mounted as a Kubernetes Secret). Long-term target is cross-account IAM role federation via GKE OIDC.

---

## Data Migration Summary

| Store | Decision | Effort | Risk |
|-------|----------|--------|------|
| RDS MySQL | Stay on AWS | None | None |
| ElastiCache Redis | Stay on AWS | None | None |
| Neo4j (EC2) | Stay on AWS | None | None |
| ClickHouse | Migrated to GKE | Medium | Low (backup/restore) |
| Confluent Kafka | Stay on AWS | None | None |
| S3 | Stay on AWS | None | None |
