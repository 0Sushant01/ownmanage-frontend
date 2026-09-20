# OwnManage Frontend

Web frontend application foundation for the OwnManage project built with React, Vite, TypeScript, Tailwind CSS, React Router, and Axios.

## Project Purpose

Provides the modern web application interface for OwnManage, configured with a scalable foundation for routing, centralized API services, and modern utility-first styling.

## Prerequisites

- Node.js (v18.0.0 or higher, tested on v22)
- npm (v9.0.0 or higher)

## Installation

Install project dependencies:

```bash
npm install
```

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Available environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL for the OwnManage backend API | `http://localhost:8000/api` |

> Note: All API requests flow through the centralized Axios client located at `src/services/api.ts`. Never commit real secrets or production credentials.

## Development Command

Start the local development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## Build Command

Type check and bundle the application for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```
