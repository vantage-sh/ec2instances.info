FROM ubuntu:20.04

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_SESSION_TOKEN
ARG DEBIAN_FRONTEND=noninteractive

LABEL org.opencontainers.image.authors="Sebastian Sasu <sebi@nologin.ro>, Cristian Magherusan-Stanciu <cristi@leanercloud.com>, Brooke McKim <brooke@vantage.sh>"

RUN apt-get update
RUN apt-get install -y python3 pip locales
RUN apt-get install -y nodejs
RUN apt-get install -y npm
RUN npm install --global sass
RUN python3 -m pip install -U pip setuptools
RUN locale-gen "en_US.UTF-8"

WORKDIR /opt/app

# install dependencies into a dedicated Docker layer, to speed up subsequent builds a bit
COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY . .

RUN invoke build

EXPOSE 8080

CMD ["invoke", "serve"]
