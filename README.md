# Amo Workflows

Sharing personal Amo workflows for demonstrating and using the features of the Amo workflow engine.

## Amo

- Amo workflow engine [https://github.com/amo-run/amo-cli](https://github.com/amo-run/amo-cli)

- [Interface/Type definition file available in workflows](https://github.com/amo-run/amo-cli/blob/main/amo-workflow.d.ts)
- [Workflow development guide](https://github.com/amo-run/amo-cli/blob/main/WORKFLOW-DEVELOPMENT.md)

## Usage

1. Install the [Amo CLI](https://github.com/amo-run/amo-cli).
2. Download a workflow from this repository, for example:
   `amo workflow get https://raw.githubusercontent.com/nodewee/amo-workflows/main/workflows/<workflow.js> --filename workflow.js`
3. Run the workflow:
   `amo run workflow.js --var key=value`

Each workflow includes its own parameters and usage instructions.

Ensure any required external CLI tools are whitelisted with Amo. 