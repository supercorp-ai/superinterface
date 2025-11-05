variable "TAG" {
  default = "latest"
}

variable "REGISTRY" {
  default = "supercorp/superinterface-server"
}

target "server" {
  context    = "."
  dockerfile = "packages/server/Dockerfile"
  tags       = ["${REGISTRY}:${TAG}"]
}

target "server-release" {
  inherits = ["server"]
  tags     = [
    "${REGISTRY}:${TAG}",
    "${REGISTRY}:latest",
  ]
}
