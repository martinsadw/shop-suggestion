FROM node:9-alpine

WORKDIR /usr/app

COPY package*.json ./
COPY wait-for-it.sh ./
RUN npm install
