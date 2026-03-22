# 🚀 Social Media Backend Platform

A scalable and secure backend system for a social media application, built using **Node.js, Express, and MongoDB**. This project implements authentication, media uploads, and structured API architecture following industry best practices.

---

## 📌 Features

* 🔐 JWT-based Authentication & Authorization
* 👤 User Registration & Login
* 📸 Image Uploads using **Multer + Cloudinary**
* 🗂️ MVC Architecture for clean code structure
* 🍪 Secure session handling with cookies
* 🔒 Password hashing using **bcrypt**

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose)
* **Authentication:** JWT (JSON Web Tokens)
* **File Upload:** Multer
* **Cloud Storage:** Cloudinary
* **Security:** bcrypt, cookie-parser

---

## 📁 Project Structure

```
src/
 ├── controllers/
 ├── models/
 ├── routes/
 ├── middlewares/
 ├── utils/
 ├── app.js
 └── index.js
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/social-media-backend.git
cd social-media-backend/src
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Create `.env` file

```
MONGODB_URL=your_mongodb_uri
PORT=3000
ACCESS_TOKEN_SECRET=your_secret_key
```

### 4️⃣ Run the server

```bash
npm run dev
```

## 🔐 Environment Variables

* `MONGODB_URL` → MongoDB connection string
* `PORT` → Server port
* `ACCESS_TOKEN_SECRET` → JWT secret key
