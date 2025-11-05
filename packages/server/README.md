# @superinterface/server

The production server used by Superinterface. This package is published to npm and also bundled into the `supercorp/superinterface-server` Docker image.

## Building and publishing the Docker image

Run these commands from the repository root (`superinterface/`):

```bash
npm install
TAG=<version> docker buildx bake server-release
docker push supercorp/superinterface-server:<version>
docker push supercorp/superinterface-server:latest
```

Replace `<version>` with the npm version you just released (for example `1.1.7`). The `server-release` bake target automatically tags both `<version>` and `latest`.
