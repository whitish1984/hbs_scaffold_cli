FROM node:16.15-bullseye-slim

USER root

COPY ./.env /tmp/.env

RUN apt-get update \
    ## Install git
    && apt-get install -y --no-install-recommends git \
    ## Install docker.
    ## see: https://docs.docker.com/engine/install/debian/
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    ## Setup docker group as synchronized as host.
    && . /tmp/.env && rm /tmp/.env \
    && groupadd -g ${DOCKER_GID} docker \
    && usermod -aG docker node \
    ## Delete unused resouces.
    && apt-get clean -y \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    ;

USER node

CMD ["sleep", "infinity"]
