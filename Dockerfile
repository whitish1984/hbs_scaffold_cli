FROM node:16.15-bullseye-slim

COPY ./ /run
WORKDIR /run/

RUN npm ci --omit=dev >/dev/null 2>&1

ENTRYPOINT [ "npm", "start", "--" ]
