# docker build . -t crm:v1.0.0
FROM --platform=linux/amd64 node:21.4.0-bullseye-slim

WORKDIR /app

RUN apt update

COPY package.json package-lock.json ./

RUN npm install pm2 -g
RUN npm install

COPY . .

EXPOSE 3000
EXPOSE 5000

CMD npm start
