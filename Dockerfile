FROM ubuntu:20.04

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG DEBIAN_FRONTEND=noninteractive

LABEL org.opencontainers.image.authors="Sebastian Sasu <sebi@nologin.ro>, Cristian Magherusan-Stanciu <cmagh@amazon.de>, Brooke McKim <brooke@vantage.sh>"

RUN apt-get update && \
    apt-get install -y python3 pip locales \
        nodejs \
        npm && \
    rm -rf /var/lib/apt/lists/*
RUN npm install --global sass
RUN python3 -m pip install --no-cache-dir -U pip setuptools
RUN locale-gen "en_US.UTF-8"

WORKDIR /opt/app

COPY . .

RUN pip3 install --no-cache-dir -r requirements.txt
RUN invoke build

EXPOSE 8080

CMD ["invoke", "serve"]
