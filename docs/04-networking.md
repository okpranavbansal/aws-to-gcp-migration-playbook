# 04 — Networking: ALB + CloudFront → GKE Gateway API

## Before: The AWS Networking Stack

```
Internet
  └── AWS WAF
      └── CloudFront (5 distributions: wyzard prd, wyzard stg, images, wyzai, roundcircle)
          └── ALB (prd-alb, stg-alb, uat-alb)
              └── ECS Services (target groups per service)
                  └── AWS Cloud Map (service discovery within VPC)
```

**Route 53** managed 48 hosted zones (product domains, marketing domains, email subdomains).

Each service had:
- A dedicated ALB target group (HTTP or gRPC)
- An ALB listener rule matching on host header (`azmuth.acme-corp.com`)
- A CloudWatch health check
- A Cloud Map service record (`azmuth.prd.internal`)

Managing 37 services meant **37+ listener rules** per ALB, with priority ordering that was easy to misconfigure.

---

## After: GKE Gateway API

```
Internet
  └── Cloud Armor WAF
      └── GKE Gateway (gke-l7-global-external-managed)
          └── HTTPRoutes (one per service, host-matched)
              └── GKE Services (ClusterIP)
                  └── Kubernetes DNS (service.namespace.svc.cluster.local)
```

### Gateway Resource

```yaml
# infrastructure/overlays/prd/networking/gateway.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: prd-copilot-gateway
  namespace: prd-copilot
  annotations:
    networking.gke.io/certmap: "prd-acme-corp-map"   # managed cert map
spec:
  gatewayClassName: gke-l7-global-external-managed
  addresses:
    - type: NamedAddress
      value: prd-copilot-ip                            # static external IP
  listeners:
    - name: http
      protocol: HTTP
      port: 80
    - name: https
      protocol: HTTPS
      port: 443
```

### HTTPRoute per Service

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: billing-service
  namespace: prd-copilot
spec:
  parentRefs:
    - name: prd-copilot-gateway
  hostnames:
    - billing.acme-corp.com
  rules:
    - backendRefs:
        - name: billing-service
          port: 8080
```

---

## Key Differences

| Concern | AWS ALB | GKE Gateway API |
|---------|---------|-----------------|
| TLS termination | ALB + ACM certificate | GKE Certificate Map (Google-managed) |
| WAF | AWS WAF (separate resource) | Cloud Armor (annotation on GCPBackendPolicy) |
| gRPC services | ALB gRPC target group (manual health path) | HTTPRoute with h2c backend |
| Cross-namespace routing | Not native | ReferenceGrant (e.g. UAT routes to STG ClickHouse) |
| Health checks | ALB target group health check | GKE HealthCheckPolicy per backend |
| Drift detection | None (console changes invisible) | ArgoCD detects and alerts |

---

## What Broke: NEG Annotation Drift

GKE automatically adds `cloud.google.com/neg` and `cloud.google.com/neg-status` annotations to Services when Network Endpoint Groups are created. ArgoCD would flag these as drift on every sync.

**Fix:** Add `ignoreDifferences` in the ApplicationSet:

```yaml
ignoreDifferences:
  - group: ""
    kind: Service
    jsonPointers:
      - /metadata/annotations/cloud.google.com~1neg
      - /metadata/annotations/cloud.google.com~1neg-status
```

---

## DNS: What Stayed on Route53

Route53 was not migrated — all 48 hosted zones remain on AWS. The GKE Gateway's static IP is referenced as an `A` record in Route53, replacing the old ALB alias records. CloudFront distributions that served static assets were updated to point at GCS buckets directly.
