# Quiet Notes

A simple Express, React, and MongoDB Atlas note app with private notes and an opt-in community feed.

## Run locally

1. Create a `.env` file in the project root using `.env.example` as a template. Set your Atlas `MONGO_URI` and a long random `JWT_SECRET`.
2. In one terminal at the project root, run `npm start` to start the Express API on port 8080.
3. In another terminal at the project root, run `npm run dev` and open the Vite URL shown in the terminal (usually `http://localhost:5173`).

Registration and login credentials are stored in MongoDB; passwords are hashed before storage. Notes are private by default. A note appears in Community only when its owner chooses **Share**.
