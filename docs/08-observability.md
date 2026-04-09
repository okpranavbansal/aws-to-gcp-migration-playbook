# 08 — Observability: CloudWatch → Prometheus Stack

## Before: CloudWatch Container Insights on ECS

On ECS Fargate, observability was built on AWS-native tooling:

| Signal | Tool | Notes |
|--------|------|-------|
| Metrics | CloudWatch Container Insights | CPU, memory, network per task/service |
| Logs | CloudWatch Logs | Per-service log groups, 1-day retention on exec logs |
| Traces | X-Ray (partial) | Only instrumented on a few services |
| Dashboards | CloudWatch Dashboards | Manual, JSON-based, hard to version |
| Alerts | CloudWatch Alarms → SNS → PagerDuty | Worked but alert config not in Git |

**Problems:**
- No unified view across metrics + logs + traces
- CloudWatch dashboards not version-controlled
- CloudWatch metrics retention: only 15 months, no cardinality control
- Logs and metrics siloed (hard to correlate a spike with a log error)

---

## After: Prometheus + Grafana + Loki + Tempo on GKE

The full observability stack was migrated to open-source tools running on GKE. See the companion portfolio repo: [gke-observability-stack](../../gke-observability-stack/) (located alongside this repo in the `portfolio/` directory).

```
Metrics:  Prometheus (kube-prometheus-stack) → Grafana
Logs:     Promtail → Loki (GCS backend) → Grafana
Traces:   OTLP → Tempo (GCS backend) → Grafana
Alerts:   PrometheusRule → Alertmanager → PagerDuty / Slack
```

### Why Grafana as the unified frontend

Single pane of glass: one dashboard can correlate a Prometheus metric spike with Loki logs and Tempo traces from the same time window, using Grafana's Explore → Logs → Traces linking.

---

## Migration Path

### Phase 1: Parallel run (completed)
- Deploy kube-prometheus-stack to GKE `observability` namespace
- Instrument GKE services with Prometheus annotations (`prometheus.io/scrape: "true"`)
- Keep CloudWatch Logs running in parallel (for ECS services still on AWS)

### Phase 2: Alerts migrated (completed)
- Re-implement all CloudWatch Alarms as `PrometheusRule` CRDs
- Route alerts through Alertmanager → PagerDuty (same routing key)
- Decommission CloudWatch Alarms after 2-week parallel validation

### Phase 3: Logs migrated (in progress)
- Promtail DaemonSet collects logs from all GKE pods
- Loki with GCS backend for long-term storage (30-day retention)
- Grafana LogQL dashboards replacing CloudWatch Insights queries

### Phase 4: Traces (future)
- Add OpenTelemetry SDK to each service
- Export traces to Tempo via OTLP gRPC
- Link traces to logs via `traceId` field in structured logs

---

## Key Metrics Tracked

```yaml
# PrometheusRule examples

# API availability SLO
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status=~"5.."}[5m]))
    /
    sum(rate(http_requests_total[5m])) > 0.01
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Error rate above 1%"

# Kafka consumer lag
- alert: KafkaConsumerLagHigh
  expr: kafka_consumer_group_lag_sum > 10000
  for: 15m
  labels:
    severity: warning

# GKE pod restarts
- alert: PodRestartingFrequently
  expr: increase(kube_pod_container_status_restarts_total[10m]) > 5
  for: 0m
  labels:
    severity: warning
```

---

## Cost Impact of Observability Migration

| Item | CloudWatch | Prometheus + Grafana (GKE) |
|------|-----------|---------------------------|
| Metrics storage | ~$180/mo (custom metrics) | ~$40/mo (Prometheus storage on PVC) |
| Log ingestion | ~$200/mo ($0.50/GB) | ~$80/mo (Loki + GCS) |
| Log storage | ~$80/mo ($0.03/GB) | ~$20/mo (GCS lifecycle 30d) |
| Traces | ~$0 (X-Ray not widely used) | ~$30/mo (Tempo + GCS) |
| Dashboards | $0 | $0 (Grafana OSS) |
| **Total** | **~$460/mo** | **~$170/mo** |
