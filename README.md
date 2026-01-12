# 🧨 Dynamite CLI

**Dynamite CLI** is an intelligent, AI-powered command-line interface designed to be your coding companion. It leverages the power of Google's Gemini models to chat, execute tools, and autonomously scaffold or modify simple applications directly from your terminal.

## ✨ Features

* **💬 AI Chat:** Have natural, context-aware conversations with the latest AI models.
* **🛠️ Tool-Enhanced Chat:** Enable specific tools to give the AI real-world capabilities during your chat.
    * **Google Search:** Fetch real-time information from the web.
    * **URL Reader:** Extract and summarize content from provided URLs.
    * **Code Executor:** Run code snippets in a secure sandbox environment.
    * **Google Maps:** Retrieve location-based information and directions.
* **🕵️ AI Agent Mode:** A powerful autonomous agent that can:
    * **Create Applications:** Generate full project structures (folders, files, config) from a single prompt.
    * **Modify Projects:** Update created files, refactor code, or add new features with context awareness.
* **Session Memory:** Remembers conversation and builts during the session for smart references (e.g., "What did I say you *before?*").
* **🔐 Secure Authentication:** Built-in device authorization flow to securely log in via your browser.

## Installation

1. Fork and Clone the repository:
    ```bash
    git clone https://github.com/your-username/Dynamite.git
    ```
2. Navigate to the project directory:
    ```bash
    cd Dynamite
    ```
4. Install dependencies:
    - Client-side dependencies:
    ```bash
    cd client (from root) or cd ../client (from server)
    pnpm install
    ```
    - Server-side dependencies:
    ```bash
    cd server (from root) or cd ../server (from client) 
    pnpm install
    ```

5. Set up environment variables:
    - Client-side:
    Run the following command to create a `.env` file in the `client` directory:
    ```bash
    cp .env.example .env
    ```
    - Server-side:
    Run the following command to create a `.env` file in the `server` directory:
    ```bash
    cp .env.example .env
    ```
    Update the `.env` files with your configuration settings as needed.

6. Set-up Prisma database:
    ```bash
    npx prisma migrate dev --name init
    npx prisma generate
    ```

## Usage

1. Run the application:
    - Client-side:
    ```bash
    pnpm run dev
    ```
    - Server-side:
    ```bash
    pnpm run dev
    ```
    
2. To run Cli type `dynamite` or `dynamite --help` to see available commands.
    ```bash
    dynamite --help
    ```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository.
2. Create a new branch:
    ```bash
    git checkout -b feature-name
    ```
3. Commit your changes:
    ```bash
    git commit -m "Add feature-name"
    ```
4. Push to your branch:
    ```bash
    git push origin feature-name
    ```
5. Open a pull request.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details

