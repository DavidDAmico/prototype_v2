# README
## Prototype v2
This project consists of a backend (Flask + PostgreSQL) and a frontend (Next.js). The environment is containerized via Docker for simple setup.


Docker Commands:

Navigate to the main directory (prototype_v2/):

Now run the following commands inside the terminal:

1. docker compose down -v 

2. docker compose build --no-cache  

3. docker compose up -d   

PNPM Commands:

Now navigate to the frontend directory (frontend/nextjs-prototype/):

Now run the following commands inside the terminal:


1. pnpm install
2. rm -rf .next && pnpm dev

After the server is up and running, open your browser and navigate to http://localhost:3000

If you click on "login" you will be redirected to the login page. There you will be able to login as a master user with the following credentials:

username: master@example.com
password: master

To register a master user, run the following command in the terminal:

register a master user via curl - to be able to login as a master:

curl -X POST "http://localhost:9000/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
           "username": "mastertest@test.com",
           "password": "master",
           "role": "master"
         }'



Please keep in mind, that the development is still in progress and there are still not all features implemented.

Parts of this project were optimized and refined with the help of AI-assisted development tools, including code generation. All logic and architecture were reviewed and adapted manually.