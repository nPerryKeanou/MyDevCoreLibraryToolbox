# MyDevCoreLibraryToolbox

A suite of productivity tools for NestJS developers. This library automates repetitive tasks and ensures a rigorous code structure within our applications.

## Generation Software : scripts/generate-module/generate-nest-module.ts

Technical note: This TypeScript script is the main engine of the toolbox. It uses fs-extra for file manipulation and picocolors for console output. It is designed to be executed via ts-node to avoid a manual compilation step during development.

## Installation and Configuration

1. Cloning and Dependencies
Start by downloading the toolbox to your machine:

```bash
git clone <git@github.com:nPerryKeanou/MyDevCoreLibraryToolbox.git>
cd MyDevCoreLibraryToolbox
npm install
```

2. Use in development mode (Internal)
To test the script directly in this repo:

```bash
# Create a modul e 'User' with Prisma (default)
npm run gen:module -- User

# Create a module 'Order' with TypeORM
npm run gen:module -- Order --typeorm
```

