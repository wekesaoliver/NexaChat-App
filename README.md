# NexaChat

**NexaChat** is a real-time messaging platform with secure user authentication, media sharing capabilities, and integrated mobile payments via M-Pesa. Built with modern web technologies, it enables seamless communication, community posts, and transaction experiences in one application.

---

## 🚀 Features
### Backend
- 🔐 **User Authentication** – Secure login and registration using JWT and hashed passwords.
- 💬 **Real-time Messaging** – Instant message delivery using Socket.io.
- 📁 **Media Support** – Upload and deliver media files via Cloudinary integration.
- 💳 **M-Pesa Integration** – Initiate and track mobile payments directly within the app.
- 🧾 **Payment Request System** – Easily create and manage payment requests.
- 🌐 **CORS-enabled API** – Works with frontend clients like React or Vue.
- 🛡️ **Role-Based Access** – Admin account created via a signup code; admins manage posts and messages, users get community access.
- 🏪 **Configurable Till (BuyGoods) STK Push** – Supports both PayBill and Till (BuyGoods) M-Pesa transactions via `MPESA_TRANSACTION_TYPE` and `MPESA_TILL_NUMBER`.
- 📢 **Admin M-Pesa Express Prompt** – Admin-only endpoint that sends an STK push prompt directly to a user's phone number.
- 📝 **Posts API** – Create, edit, delete, and like broadcast posts with images, prices, and store links.
- ⚙️ **Config Endpoint** – Serves the store URL to the frontend.

### Frontend
- 🔐 **User Authentication** – Sign up and log in with protected routes.
- 🙋 **Profile & Settings Pages** – Manage user profiles, preferences, and your M-Pesa phone number.
- 📶 **Online Users Tracker** – See who's online in real time.
- 🎨 **Theming Support** – Light/dark mode and customizable themes.
- 🚀 **React + Vite + Tailwind CSS** – Super-fast builds and responsive UI.
- 🔔 **Notifications** – Integrated toast messages using `react-hot-toast`.
- 📢 **Admin Broadcast Posts** – Admins publish posts with titles, images, prices, and store links; new posts appear on every user's feed in real time.
- ❤️ **Post Likes** – Like/unlike posts and watch the count update live across all feeds.
- 👥 **Admin-Only DMs** – Users can only message the admin; the admin can chat with anyone.
- 🛍️ **Visit Store** – One-click link to the ecommerce store from the navbar and from each post.
- 📱 **Phone Number Field** – Optional phone number on signup and in Settings, used by the admin to send M-Pesa Express payment prompts.
- 🔑 **Admin Code Signup** – Enter the optional admin code during signup to create an admin account.
- 💳 **Role-Based Payment Buttons** – Users see "Pay with Till"; admins see "M-Pesa Express" to prompt a user for payment.
- 🗑️ **Message Deletion** – Admins and message senders can delete messages.
- 💬 **Reply Draft** – Replying to a post pre-fills a draft message in the chat with the admin.

---

## 🧩 Problem It Solves

In regions where mobile money is central to daily transactions (like in Kenya), chat and payment apps are usually separate. NexaChat combines both, allowing users to:

- Chat in real-time
- Share media
- Send or request payments, all from one place

This helps streamline workflows for freelancers, small businesses, and teams needing integrated communication and payment functionality.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Authentication**: JWT, bcryptjs, cookies
- **Media**: Cloudinary
- **Payments**: M-Pesa Daraja API (PayBill & Till/BuyGoods)
- **Environment Management**: dotenv

---

## 📦 Installation

### Prerequisites

- Node.js (v16+)
- MongoDB
- A Cloudinary account (for media handling)
- M-Pesa Daraja credentials

### Backend Setup

```bash
git clone https://github.com/wekesaoliver/NexaChat.git
cd Nexachat/Backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in MongoDB URI, JWT secret, Cloudinary & M-Pesa credentials
# Plus STORE_URL (your ecommerce store link for the "Visit Store" button)
# and ADMIN_SIGNUP_CODE (optional secret code that creates an admin account)
# MPESA_TRANSACTION_TYPE: CustomerPayBillOnline (default) or CustomerBuyGoodsOnline (Till)
# MPESA_TILL_NUMBER: required when using Till (BuyGoods) transactions

# Start the server
npm run dev
```

### Frontend Setup

```bash
# Clone the repository
cd client

# Install dependencies
npm install

# Start the development server
npm run dev
```

# 📁 Folder Structure
```
backend/
├── src/
│   ├── routes/              # API route definitions (auth, messages, mpesa, posts, config)
│   ├── lib/                 # DB and socket setup
│   ├── middleware/          # Authentication middleware
│   ├── models/              # Chat models setup
│   ├── utils/               # Mpesa utilities
│   ├── controllers/         # Request handlers
│   └── index.js             # App entry point
├── .env                     # Environment variables
├── package.json             # Node.js project metadata
└── ...
```

```
client/
├── components/         # Reusable UI components (Navbar, PostCard, AdminPromptModal, etc.)
├── constants/          # Static constants and config values
├── lib/                # Utility functions and helpers
├── pages/              # Page components (Posts, Chat, Login, Signup, Settings, Profile)
├── store/              # Zustand stores for auth, theme, chat, posts, payments
├── App.jsx             # Main app component with routing
├── main.jsx            # Entry point for the React app
├── index.html          # HTML template
├── tailwind.config.js  # Tailwind CSS configuration
├── vite.config.js      # Vite configuration
└── package.json        # Project metadata and dependencies
```

---

## 📸 Screenshots

Here’s a preview of the NexaChat application on desktop and mobile:

| Signup Page (Desktop) | Login Page (Desktop) |
|-----------------------|----------------------|
| ![Signup Page](screenshots/Screenshot%20from%202026-08-18%2019-24-24.png) | ![Login Page](screenshots/Screenshot%20from%202026-08-18%2019-25-38.png) |

| Signup with Phone & Admin Code | Posts Feed |
|-------------------------------|------------|
| ![Signup Fields](screenshots/Screenshot%20from%202026-08-18%2019-25-18.png) | ![Posts Feed](screenshots/Screenshot%20from%202026-08-18%2019-26-23.png) |

| Chat Interface | Settings Page |
|----------------|---------------|
| ![Chat](screenshots/Screenshot%20from%202026-08-18%2019-26-42.png) | ![Settings](screenshots/Screenshot%20from%202026-08-18%2019-27-13.png) |

| Admin M-Pesa Express Prompt | M-Pesa Payment |
|----------------------------|----------------|
| ![Admin Prompt](screenshots/Screenshot%20from%202026-08-18%2019-28-05.png) | ![M-PESA payment](screenshots/mpesa.png) |

| Mobile Signup | Mobile View |
|---------------|-------------|
| ![Mobile Signup](screenshots/(Samsung%20Galaxy%20S20%20Ultra)%20(1).png) | ![Mobile View](screenshots/Samsung%20Galaxy%20S20%20Ultra)%20(1).png) |

| User Profile | Settings Page |
|--------------|----------------|
| ![Profile](screenshots/profile.png) | ![Settings](screenshots/settings.png) |


# 📮 API Endpoints
| Route | Description |
|-------|-------------|
| `/api/auth` | Auth (register/login) |
| `/api/messages` | Messaging routes |
| `/api/mpesa/initiate` | M-Pesa STK push initiation |
| `/api/mpesa/admin-prompt` | Admin-only M-Pesa Express prompt |
| `/api/mpesa/status` | Check payment status |
| `/api/payment-requests` | Payment request management |
| `/api/posts` | Broadcast posts (create, edit, delete, like) |
| `/api/config` | App config (store URL) |

# ✨ Future Enhancements
🔔 Push notifications
👥 Group chat functionality
🤖 AI-powered chatbot integration
📈 Analytics dashboard

# 🧑‍💻 Contributing

1. Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
2. Fork the repository
3. Create your feature branch (git checkout -b feature/AmazingFeature)
4. Commit your changes (git commit -m 'Add some AmazingFeature')
5. Push to the branch (git push origin feature/AmazingFeature)
6. Open a pull request

© 2026 NexaChat. All rights reserved.