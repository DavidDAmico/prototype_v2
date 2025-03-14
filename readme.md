docker commands:

docker compose down -v 

docker compose build --no-cache  

docker compose up -d   


register a master user via curl - to be able to login as a master:

curl -X POST "http://localhost:9000/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
           "username": "master",
           "email": "master@example.com",
           "password": "master",
           "role": "master"
         }'