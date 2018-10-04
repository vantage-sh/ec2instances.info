FROM centos:7

MAINTAINER Sebastian Sasu <sebi@nologin.ro>

ENV PACKAGES python36-devel libxml2-devel libxslt-devel openssl-devel gcc

RUN yum -y install epel-release && \
    yum -y update && \
    yum -y install ${PACKAGES} && \
    yum -y clean all && \
    rm -rf /var/tmp/* /var/cache/yum/* /root/.cache && \
    python3.6 -m ensurepip

WORKDIR /opt/app

COPY requirements.txt .

RUN pip3.6 install -r requirements.txt

COPY . .

ENV HTTP_HOST=0.0.0.0 HTTP_PORT=8080

RUN invoke build

EXPOSE 8080

CMD ["invoke", "serve"]
