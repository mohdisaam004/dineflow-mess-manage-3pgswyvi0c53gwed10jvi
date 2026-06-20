# Baraha Bad Boys Mess: Mess Management System
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ibrahimhumayun0614/baraha-mess)
Baraha Bad Boys Mess is a sophisticated, minimalist mess management application designed for seamless tracking of member contributions and expenses. It features distinct dashboards for admins and members. Admins can initialize the monthly cycle, manage members, set contribution amounts, and oversee all financial activity. Members can log their expenses, view their personal balance, and track their spending history. The system provides real-time updates, dynamic calculation of balances, and generates detailed daily and monthly reports in Excel format. An integrated audit log captures key actions, including device information, ensuring transparency and accountability.
## Key Features
-   **Dual Dashboards**: Separate, tailored views for Admins and Members.
-   **Admin Control Panel**: Manage members, set monthly contributions, and view all financial activity.
-   **Member Expense Logging**: Simple form for members to log expenses with automatic device info capture.
-   **Real-Time Balance Updates**: Balances are dynamically recalculated as expenses are logged.
-   **Comprehensive Reporting**: Generate and download daily and monthly reports (e.g., `Baraha_Bad_Boys_Mess_Admin_Report_...xlsx`) in Excel format.
-   **Audit Trail**: Key actions are logged with user details, timestamps, and device info for transparency.
-   **Minimalist UI/UX**: A clean, modern, and responsive interface built with shadcn/ui and Tailwind CSS.
## Technology Stack
-   **Frontend**: React, Vite, React Router, Tailwind CSS
-   **UI Components**: shadcn/ui, Lucide React, Framer Motion
-   **State Management**: Zustand
-   **Forms**: React Hook Form with Zod for validation
-   **Backend**: Hono on Cloudflare Workers
-   **Storage**: Cloudflare Durable Objects
-   **Language**: TypeScript
-   **Reporting**: `xlsx` for client-side Excel generation
## Getting Started
Follow these instructions to get the project up and running on your local machine for development and testing purposes.
### Prerequisites
-   [Node.js](https://nodejs.org/en/) (v18 or later)
-   [Bun](https://bun.sh/)
-   [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
### Installation
1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd baraha-mess
    ```
2.  **Install dependencies:**
    This project uses Bun for package management.
    ```bash
    bun install
    ```
### Running the Development Server
To start the local development server, which includes both the Vite frontend and the Hono backend on Cloudflare Workers, run:
```bash
bun dev
```
The application will be available at `http://localhost:3000`.
## Project Structure
The codebase is organized into three main directories:
-   `src/`: Contains the entire React frontend application, including pages, components, hooks, and utility functions.
-   `worker/`: Contains the Hono backend API, entity definitions for Durable Objects, and routing logic.
-   `shared/`: Contains TypeScript types and interfaces that are shared between the frontend and the backend to ensure type safety.
## Development Scripts
-   **`bun dev`**: Starts the development server with live reloading.
-   **`bun build`**: Builds the frontend application for production.
-   **`bun lint`**: Lints the codebase to check for errors and style issues.
## Deployment
This application is designed to be deployed to Cloudflare Pages with a Functions backend.
1.  **Login to Wrangler:**
    Authenticate with your Cloudflare account.
    ```bash
    wrangler login
    ```
2.  **Deploy the application:**
    Run the deploy script to build the application and deploy it to your Cloudflare account.
    ```bash
    bun deploy
    ```
Alternatively, you can deploy directly from your GitHub repository using the button below.
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ibrahimhumayun0614/baraha-mess)
