# Security Policy

## Supported Version

This is an early OSS toolkit. Security fixes are handled on the main public branch unless a later release process is documented.

## Reporting A Vulnerability

Do not post secrets, customer data, private commercial data, or exploitable details in a public issue.

Report security concerns to the repository maintainer through the private contact channel listed in the GitHub repository profile or project maintainers document. If no private channel is available yet, open a public issue with a minimal non-sensitive summary and ask for a private disclosure route.

## Data Handling Rules

Never include:

- `.env` files;
- API keys, tokens, passwords, private keys, or DSNs;
- real customer data;
- private commercial data;
- local absolute paths;
- private 3D asset libraries;
- local verification artifacts.

## Maintainer Response

The maintainer should:

1. acknowledge the report;
2. reproduce the issue without requesting private data in public;
3. prepare a minimal patch;
4. document user impact and mitigation;
5. avoid exposing sensitive details until a fix is available.
