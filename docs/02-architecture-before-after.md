# 02 — Architecture: Before (AWS) and After (GCP)

## Before: AWS ECS Fargate

```mermaid
flowchart TD
    subgraph internet [Internet]
        Users[Users / Browsers]
    end

    subgraph edge [Edge Layer - AWS]
        WAF[AWS WAF]
        CF1[CloudFront\nwyzard prd]
        CF2[CloudFront\nwyzai prd]
        CF3[CloudFront\nimages prd]
    end

    subgraph alb [Load Balancers]
        ALB_PRD[prd-alb\nap-southeast-1]
        ALB_STG[stg-alb\nus-east-1]
        ALB_UAT[uat-alb\nus-east-1]
    end

    subgraph ecs [ECS Fargate Clusters - ap-southeast-1]
        subgraph b2b [wyz-b2b cluster\n20 services]
            Azmuth[azmuth\ngRPC LLM gateway]
            Bifrost[bifrost\nAPI gateway]
            Merlin[merlin\nAI orchestrator]
            Others1[... 17 more]
        end
        subgraph platform [platform cluster\n10 services]
            Owlery[owlery\nemail/messaging]
            Floo[floo\nintegrations]
            Others2[... 8 more]
        end
        subgraph discovery [discovery cluster\n7 services]
            Scryer[scryer\ndata enrichment]
            Others3[... 6 more]
        end
    end

    subgraph data [Data Layer]
        RDS[(RDS MySQL\nmulti-AZ)]
        Redis[(ElastiCache Redis)]
        Neo4j[(Neo4j\nEC2 ASG)]
        CH_EC2[(ClickHouse\nEC2)]
        S3[(S3 Buckets\n12 buckets)]
    end

    subgraph kafka [Async Layer]
        Confluent[Confluent Cloud\nKafka - AWS hosted]
    end

    subgraph dns [DNS]
        R53[Route53\n48 hosted zones]
    end

    Users --> R53 --> WAF
    WAF --> CF1 --> ALB_PRD
    WAF --> CF2 --> ALB_PRD
    WAF --> CF3 --> S3
    ALB_PRD --> b2b
    ALB_PRD --> platform
    ALB_PRD --> discovery
    ecs --> RDS
    ecs --> Redis
    ecs --> Neo4j
    ecs --> CH_EC2
    ecs --> Confluent
    ecs --> S3
```

---

## After: GCP GKE

```mermaid
flowchart TD
    subgraph internet [Internet]
        Users[Users / Browsers]
    end

    subgraph edge [Edge Layer - GCP]
        CloudArmor[Cloud Armor WAF]
        GW_PRD[GKE Gateway\nprd-copilot-ip\ngke-l7-global-external-managed]
    end

    subgraph gke_prd [GKE Cluster - prj-acme-prd - asia-southeast1]
        subgraph ns_prd [prd-copilot namespace]
            BillingSvc[billing-service]
            AuthSvc[auth-service]
            MessagingSvc[messaging-service]
            IntegrationSvc[integration-service]
            AnalyticsSvc[analytics-service]
            CH_GKE[clickhouse\nStatefulSet\npd-ssd 200GB]
            Others[... 17 more workloads]
        end
    end

    subgraph gitops [GitOps Layer]
        ArgoCD[ArgoCD\nargocd namespace]
        Repo[GitHub\niac-gcp repo\nmain branch]
        KSOPS[KSOPS Plugin\nSOPS decrypt]
    end

    subgraph data_unchanged [Unchanged Data Layer - AWS]
        RDS[(RDS MySQL\nap-southeast-1)]
        Neo4j[(Neo4j\nEC2 ASG)]
        Confluent[Confluent Cloud\nKafka]
        S3[(S3 Buckets)]
    end

    subgraph dns [DNS - unchanged]
        R53[Route53\n48 hosted zones\nA record → GKE IP]
    end

    Users --> R53 --> CloudArmor --> GW_PRD
    GW_PRD --> ns_prd
    ArgoCD -- polls --> Repo
    ArgoCD -- decrypts via --> KSOPS
    ArgoCD -- applies --> gke_prd
    ns_prd --> RDS
    ns_prd --> Neo4j
    ns_prd --> Confluent
    ns_prd --> CH_GKE
    ns_prd --> S3
```

---

## Component Mapping Table

| AWS Component | GCP Equivalent | Notes |
|--------------|----------------|-------|
| ECS Fargate cluster | GKE Autopilot namespace | No node management on Autopilot |
| ECS service + task definition | Kubernetes Deployment | `deployment.yaml` per service |
| ECS task JSON (37 files) | Kustomize base + overlays | Single base, env-specific overlays |
| ALB listener rules | HTTPRoute per service | Gateway API host-based routing |
| CloudFront | GKE Gateway + Cloud Armor | L7 Global LB with cert map |
| ACM certificate | GKE Certificate Map | Google-managed certs |
| AWS Cloud Map | Kubernetes DNS | `svc.namespace.svc.cluster.local` |
| SSM Parameter Store | SOPS + Age (in Git) | Secrets encrypted, version-controlled |
| ecsTaskExecutionRole | Workload Identity (KSA → GSA) | Namespace-scoped, auto-rotating |
| ECS Exec | `kubectl exec` | Same capability |
| CloudWatch Container Insights | Prometheus + Grafana (future) | See gke-observability-stack repo |
| ECR | Artifact Registry | Single repo, path-based |
| Jenkins on ECS | GitHub Actions | CI moved to GHA on migration |
| ClickHouse on EC2 | ClickHouse StatefulSet on GKE | pd-ssd PVC, `reclaimPolicy: Retain` |
