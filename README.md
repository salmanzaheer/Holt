# ☁️ Hault - Private Cloud Storage

**Hault** is a robust, self-hosted private cloud solution designed for secure file storage, media streaming, and password management. Built with a modern tech stack, it offers a privacy-focused alternative to commercial cloud providers, fully containerized for easy deployment.

![Hault Dashboard](https://placeholder-image.com/dashboard-preview.png) *Replace with actual screenshot*

## 🚀 Features

### 📂 File Management
*   **Hierarchy:** Create nested folders to organize your digital life.
*   **Operations:** Upload, Download, Rename, Move, and Delete files and folders.
*   **Drag & Drop:** Intuitive drag-and-drop upload interface.
*   **Search:** Global search across all your files and folders.

### 🔐 Security & Privacy
*   **Encryption:** Files are encrypted at rest using **AES-256-CBC**.
*   **Password Vault:** dedicated, encrypted vault for storing sensitive credentials.
*   **2FA:** Support for Two-Factor Authentication (TOTP).
*   **Audit Logs:** Detailed logging of all user actions (login, upload, delete, etc.) for security compliance.
*   **JWT Auth:** Secure, token-based authentication with short-lived media tokens.

### 🎬 Media & Productivity
*   **Media Streaming:** Stream Video and Audio files directly in the browser.
*   **Image Gallery:** Grid view with auto-generated thumbnails for images.
*   **PDF Viewer:** Built-in PDF previewer.
*   **Sharing:** Share files internally with other users (extensible to public links).

## 🛠 Tech Stack

*   **Frontend:** React 18, Vite, TailwindCSS, DaisyUI, React Router v6.
*   **Backend:** Node.js, Express.js.
*   **Database:** SQLite (default for ease of use) or PostgreSQL (production ready).
*   **Containerization:** Docker, Docker Compose, Nginx (Reverse Proxy).

## 📦 Deployment

### Prerequisites
*   Docker & Docker Compose installed on your machine.

### Quick Start (Production Mode)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/hault.git
    cd hault
    ```

2.  **Configure Environment (Optional):**
    The `docker-compose.yml` comes with safe defaults for a local private cloud using SQLite.
    To change secrets, update the `environment` section in `docker-compose.yml`.

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up -d --build
    ```

4.  **Access the App:**
    Open your browser and go to: **`http://localhost:8080`**

5.  **Data Persistence:**
    *   Files are stored in: `./storage`
    *   Database is stored in: `./data/hault.db`
    *   *Back up these directories regularly.*

## 💻 Development Setup

If you want to contribute or run components individually:

### Backend
```bash
cd backend
npm install
# Create a .env file based on the example below
node server.js
```
*Backend runs on port 3001.*

### Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on port 5173.*

### Environment Variables (`backend/.env`)
```env
PORT=3001
JWT_SECRET=your_super_secret_jwt_key
ENCRYPTION_KEY=32_byte_long_string_for_aes_256!
STORAGE_PATH=./storage
# Uncomment for Postgres
# PG_HOST=localhost
# PG_USER=postgres
# PG_PASSWORD=password
# PG_DATABASE=hault
```

## 🗺 Project Structure

```
hault/
├── backend/             # Node.js API
│   ├── db/              # Database config & migrations
│   ├── middleware/      # Auth & Validation
│   ├── routes/          # API Endpoints (Auth, Files, Folders, Passwords)
│   └── storage/         # Local file storage (gitignored)
├── frontend/            # React Application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Main views (Dashboard, Login, etc.)
│   │   └── services/    # API client (Axios)
├── docker-compose.yml   # Production orchestration
└── README.md            # Documentation
```

## 🔒 NIST CSF Alignment

*   **Identify:** Asset management via Database (Files, Users).
*   **Protect:** AES-256 Encryption, 2FA, JWT Auth.
*   **Detect:** Comprehensive Audit Logging table.
*   **Respond/Recover:** Containerized architecture allows quick restoration; Data decoupled from logic via volumes.

---
© 2025 Hault Team. Internal Use Only.