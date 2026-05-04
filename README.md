# OrderLab

OrderLab is a sandbox for experimenting with QR-based restaurant ordering UX, client libraries, and compatible mock servers.

## Safety Notice

This project is intended for local mock servers, UI experiments, and protocol research.

Do not use this project to send orders, staff calls, checkout requests, or any other operational requests to real stores or third-party services.

By default, access to official services and write operations should be disabled.

## Setup

```bash
bun i
```

## Compatible Mock Server

```bash
cd packages/server
bun dev
```

You can see the dashboard at `/dashboard`.

The mock server provides a local environment for testing QR-based ordering flows without sending requests to real stores or third-party services.

## Client Library

A QR-based restaurant ordering client library written in JS/TS.

```bash
cd packages/client
```

Package name:

```text
@orderlab/client
```

## OrderLab App

OrderLab App is a client app for experimenting with better ordering UX and performance.

```bash
cd apps/orderlab
bun dev
```

## Development Policy

OrderLab should prioritize safe local testing and mock-server compatibility.

The default development flow should be:

```text
OrderLab App
  ↓
OrderLab Client Library
  ↓
Compatible Mock Server
```

Requests to real services should not be enabled by default.

## Suggested Environment Variables

```env
BETTERZERIYA_ALLOW_OFFICIAL=false
BETTERZERIYA_DRY_RUN=true
```

Recommended behavior:

- `BETTERZERIYA_ALLOW_OFFICIAL=false`
  - Blocks official-service session creation.
- `BETTERZERIYA_DRY_RUN=true`
  - Prevents write operations such as order submission and staff calls.

## Repository Structure

```text
apps/
  orderlab/
    OrderLab client app

packages/
  client/
    QR-based restaurant ordering client library

  server/
    Compatible mock server
```

## Scope

This project may be used for:

- UI/UX experiments
- Local mock-server testing
- Client-library development
- Protocol research in a safe environment

This project should not be used for:

- Sending real orders
- Calling real store staff
- Interacting with production restaurant systems
- Load testing third-party services
- Bypassing intended service flows

## License

TBD