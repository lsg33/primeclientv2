FROM node:18-slim

WORKDIR /usr/src/momentum

COPY package*.json ./

RUN apt-get update && apt-get install -y python3 build-essential

RUN npm install
RUN npm install -g typescript

COPY . .
RUN  tsc

ENV NODE_ENV=production

EXPOSE 8080
EXPOSE 80

HEALTHCHECK CMD curl --fail http://localhost:80 || exit 1   

CMD [ "npm", "start" ]
