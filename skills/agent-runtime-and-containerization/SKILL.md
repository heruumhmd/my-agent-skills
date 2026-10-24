---
name: agent-runtime-and-containerization
description: Packages agent skills into hardened OCI containers, Kubernetes jobs, Agent-to-Agent (A2A) endpoints, and vendor-agnostic REST microservices (POST /run) using initializ/forge and skrun-dev/skrun. Use when packaging agent skills for production infrastructure, containerizing autonomous agent tasks for Kubernetes or CI/CD pipelines, exposing skills as secure REST or A2A APIs, or connecting skills through enterprise MCP Gateways.
---

# Agent Runtime and Containerization

Transform open `SKILL.md` workflows and agent capabilities into production-ready, hardened OCI containers, Kubernetes jobs, Agent-to-Agent (A2A) endpoints, and vendor-neutral microservice REST APIs (`POST /run`).

## Overview

While `SKILL.md` provides Markdown-first procedural knowledge for local IDEs (Antigravity, Claude Code, Cursor, Codex), running skills autonomously in production requires:
1. **Deterministic Sandboxing**: Isolating execution inside non-root, capability-dropped OCI containers or microVMs.
2. **Stateless Microservice API**: Serving skills via standardized HTTP endpoints (`POST /run`) regardless of model backend (`initializ/forge` and `skrun-dev/skrun`).
3. **Agent-to-Agent (A2A) Orchestration**: Enabling autonomous agents across distinct networks or clusters to discover, negotiate, and invoke containerized skills.
4. **Enterprise MCP Gateway Connectivity**: Exposing containerized skills to cloud services (GCP/GKE, AWS, Azure, BigQuery) through unified MCP Gateways.

```
┌──────────────┐     ┌─────────────────────────────────────────────────────────┐
│   SKILL.md   │ ──→ │ initializ/forge & skrun-dev/skrun Toolchain             │
└──────────────┘     └─────────────────────────────────────────────────────────┘
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
   │ OCI Container │         │ REST API      │         │ A2A Endpoint  │
   │  & K8s Job    │         │ (POST /run)   │         │ & MCP Gateway │
   └───────────────┘         └───────────────┘         └───────────────┘
```

## When to Use

- Deploying agent skills to production Kubernetes clusters or serverless container runtimes.
- Exposing a local skill as an authenticated microservice REST API for external callers.
- Creating hardened, reproducible CI/CD runners for autonomous agent workflows.
- Establishing Agent-to-Agent (A2A) communication channels between disparate agent harnesses.
- Bridging skills to enterprise infrastructure via MCP Gateways (GKE, Cloud Run, BigQuery).

---

## Architecture & Workflows

### 1. Generating Hardened Container Images (`initializ/forge`)

Use `initializ/forge` to compile a skill directory into a minimal, rootless container image:

```bash
# Initialize container packaging for a skill
npx @initializ/forge init ./skills/superpowers-autonomous-engineering --runtime node22

# Build the hardened OCI container image
npx @initializ/forge build --tag ghcr.io/heruumhmd/skill-superpowers:latest --hardened
```

#### Production Containerfile / Dockerfile Template
```dockerfile
# Multi-stage build for minimal attack surface
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs22-debian12:nonroot
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . /app/
USER nonroot:nonroot
ENV NODE_ENV=production
EXPOSE 8080
ENTRYPOINT ["/nodejs/bin/node", "runtime.js"]
```

Key hardening controls enforced by forge:
- Distroless non-root base image (`nonroot:nonroot` UID 65532).
- Read-only root filesystem with ephemeral memory-backed `/tmp` (`tmpfs`).
- Dropped Linux capabilities (`ALL` capabilities dropped, `no-new-privileges: true`).
- CPU and memory resource quotas configured upfront.

---

### 2. Microservice REST API Runtime (`skrun-dev/skrun`)

Run any skill as a standalone HTTP microservice with input/output validation:

```bash
# Serve skill locally on port 8080
npx skrun serve ./skills/agent-browser-automation --port 8080 --auth-token $SKILL_SECRET
```

#### The Universal `POST /run` Contract

Every containerized skill exposes a deterministic JSON invocation contract:

**Request:**
```http
POST /run HTTP/1.1
Host: skill-runner.internal:8080
Authorization: Bearer sk-live-secret-token
Content-Type: application/json

{
  "skill": "agent-browser-automation",
  "action": "extract-accessibility-tree",
  "parameters": {
    "url": "https://dashboard.internal",
    "viewport": { "width": 1280, "height": 800 }
  },
  "timeout_ms": 30000
}
```

**Response:**
```json
{
  "status": "success",
  "execution_id": "exec-992a71bc",
  "result": {
    "nodes_extracted": 42,
    "tree_ref": "@e1->@e42",
    "evidence": "Accessibility snapshot generated successfully"
  },
  "metrics": {
    "duration_ms": 1420,
    "memory_mb": 48
  }
}
```

---

### 3. Kubernetes Job & Sandboxing Manifest

Deploy autonomous batch workloads safely in Kubernetes with gVisor (`runsc`) or Kata Containers runtime classes:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: autonomous-skill-runner
  namespace: agent-workloads
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      runtimeClassName: gvisor
      restartPolicy: Never
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop: ["ALL"]
      containers:
        - name: skill-executor
          image: ghcr.io/heruumhmd/skill-superpowers:latest
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
            requests:
              cpu: "500m"
              memory: "512Mi"
          env:
            - name: EXECUTION_MODE
              value: "autonomous"
            - name: API_KEY
              valueFrom:
                secretKeyRef:
                  name: agent-secrets
                  key: anthropic-key
          volumeMounts:
            - name: ephemeral-storage
              mountPath: /tmp
      volumes:
        - name: ephemeral-storage
          emptyDir:
            medium: Memory
            sizeLimit: 1Gi
```

---

### 4. Agent-to-Agent (A2A) Discovery and Protocol

Autonomous agents negotiate capabilities via discovery endpoints:

```
Agent A (Planner)                         Agent B (Containerized Skill)
       │                                                │
       │─── GET /.well-known/agent-skills.json ────────→│
       │←── 200 OK (Supported actions, schemas) ───────│
       │                                                │
       │─── POST /run (Signed A2A Payload) ────────────→│
       │←── 200 OK (Deterministic Artifact + Hash) ─────│
```

Manifest format (`/.well-known/agent-skills.json`):
```json
{
  "schema_version": "1.0",
  "agent_id": "org.heru.skill-runtime",
  "skills": [
    {
      "name": "agent-runtime-and-containerization",
      "endpoint": "/run",
      "methods": ["POST"],
      "auth": "bearer-jwt",
      "rate_limit_rpm": 120
    }
  ]
}
```

---

## Common Rationalizations

| Rationalization | Truth |
| :--- | :--- |
| "Running code locally without containers is faster for development." | Host system pollution and lack of sandboxing leave agents vulnerable to command injection and state drift across runs. |
| "A bash script is enough to trigger the skill." | Shell scripts lack structured JSON-RPC error handling, memory limits, and vendor-neutral HTTP integration. |
| "We can run the container as root inside our private cluster." | Any prompt injection exploit can escape or compromise cluster infrastructure. Always drop all capabilities. |

---

## Red Flags

- Containers running with `privileged: true` or as root (`UID 0`).
- Writing output files outside designated `/tmp` volume mounts on read-only filesystems.
- Hardcoded API credentials inside Dockerfiles or container layers.
- Exposing `/run` endpoints without authentication or rate limiting.
- Missing resource request and limit bounds in Kubernetes manifests.

---

## Verification

- [ ] Container build succeeds using non-root base images (`gcr.io/distroless` or `alpine`).
- [ ] Container filesystem is verified read-only except for ephemeral `/tmp`.
- [ ] Microservice responds with valid HTTP status and structured JSON to `POST /run`.
- [ ] Security scan passes zero critical or high CVEs (`trivy image <tag>`).
- [ ] Kubernetes manifests include explicit CPU/memory limits and capability drops.
