# 06 — Kafka & Confluent: Why It Stayed on AWS

## Summary

Confluent Cloud Kafka was the one component we explicitly decided NOT to migrate. Every microservice that moved from ECS to GKE still talks to the same Confluent cluster on AWS.

---

## Our Kafka Setup

```hcl
# Confluent Cloud Standard cluster on AWS ap-southeast-1
resource "confluent_kafka_cluster" "standard" {
  display_name = "${var.environment}-wyz"
  cloud        = "AWS"
  availability = var.availability   # MULTI_ZONE in prd
  region       = "ap-southeast-1"

  standard {}

  environment {
    id = confluent_environment.environment.id
  }

  lifecycle {
    prevent_destroy = true   # topics + data are precious
  }
}
```

Topics use 7-day retention, 2 min ISR, delete cleanup policy. Partition counts are sized for prd throughput (typically 6-12 per topic).

---

## Why We Kept It on AWS

### 1. Confluent Cloud is already cloud-native

Confluent Cloud is a managed service — it does not run on ECS or EC2. It is billed per CKU (Confluent Kafka Unit), not per compute instance. There is no "GCP version" of Confluent that is materially different from the AWS version.

### 2. Migration requires data movement

Moving to Confluent on GCP (or Apache Kafka on GKE) would require:
- **Topic data migration**: Confluent Replicator or MirrorMaker2 to copy messages in-flight
- **Consumer group offset migration**: consumers would need to reset offsets and potentially reprocess
- **Cutover coordination**: producers and consumers need to switch simultaneously
- **Risk window**: during migration, messages could be lost or duplicated

For a platform with 20+ topics across production environments, this is a multi-week effort with significant risk.

### 3. Cross-cloud latency is acceptable

GKE (asia-southeast1) → Confluent (AWS ap-southeast-1) are in the same geographic region. Measured produce/consume latency: P99 < 15ms. This is within our SLO budget.

### 4. GCP's managed Kafka offering (Pub/Sub) is not a drop-in replacement

Google Cloud Pub/Sub has a fundamentally different API from Kafka. Migrating would require code changes to all producers and consumers — not just config changes.

---

## How GKE Services Connect to Confluent

Confluent credentials (bootstrap server URL, API key, API secret) are stored as SOPS-encrypted secrets in Git, decrypted by KSOPS at sync time, and mounted as environment variables:

```yaml
# apps/messaging-service/overlays/prd/config.env (SOPS encrypted)
KAFKA_BOOTSTRAP_SERVERS=pkc-PLACEHOLDER.ap-southeast-1.aws.confluent.cloud:9092
KAFKA_API_KEY=PLACEHOLDER_KEY
KAFKA_API_SECRET=PLACEHOLDER_SECRET
KAFKA_SECURITY_PROTOCOL=SASL_SSL
KAFKA_SASL_MECHANISM=PLAIN
```

The same connection pattern that ECS tasks used — only the runtime (Fargate task vs GKE pod) changed.

---

## Future Consideration

If Confluent Cloud ever offers cost parity on GCP, or if the team wants to consolidate everything on GCP, the migration path would be:

1. Stand up Confluent on GCP (or Kafka on GKE via Strimzi operator)
2. Use MirrorMaker2 to replicate all topics
3. Switch consumer groups to new cluster one service at a time
4. Drain old cluster after all consumers have caught up
5. Decommission old cluster

This is a well-understood pattern and can be done with near-zero downtime if planned carefully.
