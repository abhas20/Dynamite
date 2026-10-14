# Contributing to Dynamite CLI

Thanks for your interest in contributing to Dynamite CLI. Contributions are welcome, whether they are bug fixes, documentation updates, new features, or improvements to the developer experience.

## Code of Conduct

Please be respectful, constructive, and collaborative in all discussions and pull requests. Keep feedback focused on the project goals and on the code itself.

## How to Contribute

### 1. Fork and clone the repository

```bash
git clone https://github.com/your-username/Dynamite.git
cd Dynamite
```

### 2. Create a new branch

Always create a dedicated branch for your work before making changes.

```bash
git checkout -b feature/your-feature-name
```

Use clear branch names such as:

- `feature/add-google-search-tool`
- `fix/auth-token-refresh`
- `docs/update-installation-guide`

### 3. Set up the project locally

Install dependencies:

```bash
pnpm install
```

Set up environment variables:

- Client-side:

```bash
cd client
cp .env.example .env
```

- Server-side:

```bash
cd server
cp .env.example .env
```

Update the generated `.env` files with your local configuration values as needed.

Generate the Prisma client:

```bash
npx prisma generate
```

Start the app:

- Client-side:

```bash
pnpm run dev
```

- Server-side:

```bash
docker compose up -d
pnpm run dev
```

This starts the Redis and PostgreSQL containers required by the server.

### 4. Run the CLI

To view available commands:

```bash
dynamite --help
```

## Development Workflow

Before opening a pull request, ensure that your changes:

- are focused on a single issue or feature
- follow the existing project structure and coding style
- do not include unrelated edits
- are tested or validated locally when possible
- are documented when behavior or setup changes

## Writing Clean Commit Messages

Use commit messages that clearly explain the change and are easy to understand during review.

Examples:

```bash
git commit -m "Add Google Search tool support"
git commit -m "Fix Prisma connection timeout in dev setup"
git commit -m "Update contributing guide with local setup steps"
```

Guidelines:

- keep the subject line short and descriptive
- use the imperative mood (`Add`, `Fix`, `Update`, `Refactor`)
- include a clear explanation in the body when needed
- avoid vague messages like `fix stuff` or `misc changes`

## Reporting Bugs

If you find a bug, please open an issue before or alongside your fix.

When creating an issue, include:

- a clear and specific title
- a description of the problem
- steps to reproduce
- expected behavior
- actual behavior
- relevant logs, screenshots, or error output
- environment details such as OS, Node version, pnpm version, and setup context

Please check for existing issues before opening a new one to avoid duplicates.

## Pull Request Process

1. Make sure your branch is up to date with the base branch.
2. Commit your changes with clear, descriptive commit messages.
3. Push your branch to your fork:

```bash
git push origin feature/your-feature-name
```

4. Open a pull request with:
   - a clear title
   - a summary of the change
   - testing or validation notes
   - references to the related issue or feature request

## Standard Practices

Please follow these project conventions:

- keep changes focused and minimal
- write readable and maintainable code
- prefer small, reviewable pull requests
- update documentation whenever setup or functionality changes
- do not commit generated or temporary files unless they are required
- keep secrets and credentials out of the repository

## Need Help?

If you are unsure about the setup or contribution flow, feel free to open an issue or ask for help. We appreciate thoughtful contributions and are happy to support new contributors.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
