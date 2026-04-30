# break-the-login

Aplicatie web de autentificare construita pentru studiul securitatii - ilustreaza vulnerabilitati comune si mecanisme de aparare.

## Stack tehnologic

| Layer | Tehnologie |
|-------|-----------|
| Frontend | React 19 + React Router 7 + Tailwind CSS 4 |
| Build tool | Vite 7 |
| Backend | Node.js + Express 5 |
| Baza de date | SQLite3 (fisier local) |
| Autentificare | Sesiuni HTTP (express-session) + bcrypt |

## Structura proiectului

```
break-the-login/
├── client/          # Frontend React (Vite)
│   └── src/
│       ├── pages/   # Login, Register, ResetPassword, Homepage
│       └── App.jsx
├── server/          # Backend Express
│   ├── index.js     # Entry point, port 3000
│   ├── routes.js    # Toate rutele API (/api/*)
│   ├── seed.js      # Schema BD si migrari
│   └── database.db  # Fisier SQLite (generat automat)
└── README.md
```
## Branch-uri
Am construit aplicația vulnerabila pe branch-ul “main”, iar pe “vulnerable” am reparat problemele de securitate. 

## Baza de date

SQLite, fisier local la `server/database.db`, care se creeaza automat.

## Rulare locala

Sunt necesare doua terminale, unul pentru backend, unul pentru frontend.

### 1. Backend (Express, port 3000)

```bash
cd server
npm install
npm start
```

### 2. Frontend (Vite, port 5173)

```bash
cd client
npm install
npm run dev
```
