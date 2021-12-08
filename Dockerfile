FROM amazonlinux:2

LABEL org.opencontainers.image.authors="Sebastian Sasu <sebi@nologin.ro>, Cristian Magherusan-Stanciu <cmagh@amazon.de>"

RUN yum -y update && \
    yum -y install python3-devel && \
    yum -y clean all && \
    rm -rf /var/tmp/* /var/cache/yum/* /root/.cache && \
    python3 -m ensurepip

WORKDIR /opt/app

COPY requirements.txt .

RUN pip3 install -r requirements.txt

COPY . .

ENV HTTP_HOST=0.0.0.0 HTTP_PORT=8080

RUN invoke build

EXPOSE 8080

CMD ["invoke", "serve"]
