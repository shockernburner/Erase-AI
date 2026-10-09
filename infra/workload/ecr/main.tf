# Phase 4: container registry (ECR) for eraseai-prod.
# One image: the API server, which also serves the website build
# (see Dockerfile). CI tags each build with the git commit SHA.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  backend "s3" {
    bucket       = "eraseai-tfstate-110796370706"
    key          = "ecr.tfstate"
    region       = "ap-southeast-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  allowed_account_ids = ["110796370706"]
  default_tags { tags = { Project = "eraseai", ManagedBy = "terraform", Stack = "ecr" } }
}

resource "aws_ecr_repository" "app" {
  name = "eraseai/app"
  # Commit-SHA tags can never be overwritten, so a deployed tag always
  # means the same image.
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Drop untagged layers after 7 days"
        selection    = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 7 }
        action       = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the 30 most recent builds"
        selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 30 }
        action       = { type = "expire" }
      },
    ]
  })
}

# Base images (node:24-bookworm-slim) come through ECR from the ECR Public
# mirror of Docker's official images: no Docker Hub rate limits in CI.
resource "aws_ecr_pull_through_cache_rule" "ecr_public" {
  ecr_repository_prefix = "ecr-public"
  upstream_registry_url = "public.ecr.aws"
}

output "repository_url" { value = aws_ecr_repository.app.repository_url }
output "repository_arn" { value = aws_ecr_repository.app.arn }
output "base_image_prefix" { value = "${aws_ecr_repository.app.registry_id}.dkr.ecr.ap-southeast-1.amazonaws.com/ecr-public/docker/library" }
