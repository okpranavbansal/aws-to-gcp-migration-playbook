# Sanitized example: ECS service pattern
# Represents the standard template used across 37 microservices
# Derived from real production configuration

module "ecs_service" {
  source  = "terraform-aws-modules/ecs/aws//modules/service"
  version = "~> 5.0"

  name        = var.app_name
  cluster_arn = data.aws_ecs_cluster.this.arn

  # Task sizing — right-sized based on P95 utilization audit
  cpu    = var.task_cpu    # e.g. 512 for most services
  memory = var.task_memory # e.g. 1024

  # Container definition
  container_definitions = {
    (var.app_name) = {
      image     = "${module.ecr[0].repository_url}:${var.image_tag}"
      essential = true

      port_mappings = [
        {
          name          = var.app_name
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      # Health check — adjust path for gRPC services
      health_check = {
        command     = var.health_check_command
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      environment = [
        { name = "APP_ENV", value = var.environment },
        { name = "SERVICE_NAME", value = var.app_name },
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = "arn:aws:ssm:${var.aws_region}:${var.account_id}:parameter/${var.environment}/${var.app_name}/DB_PASSWORD"
        }
      ]

      log_configuration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/${var.environment}-${var.app_name}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  }

  # Service discovery — private DNS via Cloud Map
  service_connect_configuration = {
    enabled   = true
    namespace = "${var.environment}.local"
    service = {
      client_alias = {
        port     = var.container_port
        dns_name = var.app_name
      }
      port_name = var.app_name
    }
  }

  load_balancer = {
    service = {
      target_group_arn = aws_lb_target_group.this.arn
      container_name   = var.app_name
      container_port   = var.container_port
    }
  }

  subnet_ids = data.aws_subnets.private.ids
  security_group_ids = [data.aws_security_group.ecs_service.id]

  # Use task execution role with ECR + SSM + Bedrock access
  task_exec_iam_role_arn = data.aws_iam_role.ecs_task_execution.arn

  # Deployment circuit breaker — auto-rollback on failed deployment
  deployment_circuit_breaker = {
    enable   = true
    rollback = true
  }

  tags = var.tags
}

# ALB target group — HTTP or gRPC depending on service
resource "aws_lb_target_group" "this" {
  name        = "${var.environment}-${var.app_name}"
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.this.id

  # Reduce deregistration delay for Fargate Spot drain
  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = var.health_check_path # "/" for HTTP, "/grpc.health.v1.Health/Check" for gRPC
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
  }
}
