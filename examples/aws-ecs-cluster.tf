# Sanitized example: ECS cluster with Fargate + Fargate Spot (50/50)
# Derived from real production configuration

module "ecs_cluster" {
  source = "terraform-aws-modules/ecs/aws//modules/cluster"

  name = "${var.environment}-${var.cluster_name}"

  # Exec command logging for debugging running containers
  configuration = {
    execute_command_configuration = {
      logging = "OVERRIDE"
      log_configuration = {
        cloud_watch_log_group_name = "/aws/ecs/${var.environment}-${var.cluster_name}"
      }
    }
  }

  # Low retention on exec logs to save CW cost
  cloudwatch_log_group_retention_in_days = 1

  # 50/50 Fargate vs Fargate Spot for cost saving
  # Fargate Spot is ~70% cheaper but tasks can be interrupted
  default_capacity_provider_strategy = {
    FARGATE = {
      weight = 50
    }
    FARGATE_SPOT = {
      weight = 50
    }
  }

  setting = [
    {
      name  = "containerInsights"
      value = var.container_insights   # "enabled" for prd, "disabled" for stg/uat
    }
  ]

  tags = var.tags
}
