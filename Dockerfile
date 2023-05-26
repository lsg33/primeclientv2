# Use a multi-stage build for better performance
FROM node:18-slim as builder

WORKDIR /usr/src/momentum

COPY package*.json ./

RUN npm install --only=production && \
    npm install -g typescript && \
    tsc

COPY . .

# Second stage: Create the final image with support for multiple architectures
FROM node:18-slim

WORKDIR /usr/src/momentum

COPY --from=builder /usr/src/momentum .

ENV NODE_ENV=production
ENV DOCKER=true

EXPOSE 8080
EXPOSE 80

HEALTHCHECK CMD curl --fail http://localhost:80 || exit 1   

CMD [ "npm", "start" ]
