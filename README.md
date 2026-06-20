# Al Iqsha Mess: Mess Management System

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ibrahimhumayun0614/baraha-mess)

Al Iqsha Mess is a sophisticated, minimalist mess management application designed for seamless tracking of member contributions and expenses. It features distinct dashboards for admins and members. Admins can initialize the monthly cycle, manage members, set contribution amounts, and oversee all financial activity. Members can log their expenses, view their personal balance, and track their spending history. The system provides real-time updates, dynamic calculation of balances, and generates detailed daily and monthly reports in Excel format. An integrated audit log captures key actions, including device information, ensuring transparency and accountability.

## Key Features

-   **Dual Dashboards**: Separate, tailored views for Admins and Members.
-   **Admin Control Panel**: Manage members, set monthly contributions, and view all financial activity.
-   **Member Expense Logging**: Simple form for members to log expenses with automatic device info capture.
-   **Real-Time Balance Updates**: Balances are dynamically recalculated as expenses are logged.
-   **Comprehensive Reporting**: Generate and download daily and monthly reports (e.g., `Al_Iqsha_Mess_Admin_Report_...xlsx`) in Excel format.
-   **Audit Trail**: Key actions are logged with user details, timestamps, and device info for transparency.
-   **JWT Authentication**: Secure API access with role-based permissions (member, admin, super admin).
-   **Minimalist UI/UX**: A clean, modern, and responsive interface built with shadcn/ui and Tailwind CSS.

## Technology Stack

-   **Frontend**: React, Vite, React Router, Tailwind CSS
-   **UI Components**: shadcn/ui, Lucide React
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
    cd al-iqsha-mess
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```
3.  **Configure local secrets:**
    Copy `.dev.vars.example` to `.dev.vars` and set your values:
    ```bash
    cp .dev.vars.example .dev.vars
    ```
    Required variables:
    - `JWT_SECRET` — secret key for signing auth tokens
    - `SUPER_ADMIN_PASSWORD` — super admin login password

### Running the Development Server

```bash
bun dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

-   `src/`: React frontend (pages, components, hooks, utilities)
-   `worker/`: Hono backend API, Durable Object entities, routing
-   `shared/`: Shared TypeScript types, app config, and mess utilities

## Development Scripts

-   **`bun dev`**: Starts the development server with live reloading.
-   **`bun build`**: Builds the frontend application for production.
-   **`bun lint`**: Lints the codebase.

## Deployment

1.  **Login to Wrangler:**
    ```bash
    wrangler login
    ```
2.  **Set production secrets:**
    ```bash
    wrangler secret put JWT_SECRET
    wrangler secret put SUPER_ADMIN_PASSWORD
    ```
3.  **Deploy:**
    ```bash
    bun deploy
    ```

Made with love by Ibrahim.
