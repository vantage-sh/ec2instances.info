FROM ubuntu:20.04

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update
RUN apt-get install -y nginx python3 pip locales curl
RUN apt-get install -y nodejs
RUN apt-get install -y npm
RUN npm install --global sass
RUN python3 -m pip install -U pip setuptools
RUN locale-gen "en_US.UTF-8"
COPY nginx.conf /etc/nginx/nginx.conf

WORKDIR /opt/app

COPY . .

RUN pip3 install -r requirements.txt
RUN invoke build

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
