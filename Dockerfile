FROM ubuntu:20.04

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_SESSION_TOKEN
ARG DEBIAN_FRONTEND=noninteractive

LABEL org.opencontainers.image.authors="Sebastian Sasu <sebi@nologin.ro>, Cristian Magherusan-Stanciu <cristi@leanercloud.com>, Brooke McKim <brooke@vantage.sh>"

RUN apt-get update > /dev/null
RUN apt-get install -y nginx python3 pip locales curl libxml2-dev libxslt-dev > /dev/null

# Add NodeSource repository and install Node.js 14
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs

RUN npm install --global sass
RUN python3 -m pip install -U pip setuptools
RUN locale-gen "en_US.UTF-8"
COPY nginx.conf /etc/nginx/nginx.conf

WORKDIR /opt/app

# install dependencies into a dedicated Docker layer, to speed up subsequent builds a bit
COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY . .

RUN invoke build

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
