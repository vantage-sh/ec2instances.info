FROM centos:7

MAINTAINER Sebastian Sasu <sebi@nologin.ro>

ENV PACKAGES python-devel libxml2-devel libxslt-devel openssl-devel python2-pip gcc

RUN yum -y install epel-release && yum -y update
RUN yum -y install ${PACKAGES} \
    && yum -y clean all \
    && rm -rf /var/tmp/* /var/cache/yum/* /root/.cache

WORKDIR /opt/app

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

ENV FAB_HOST=0.0.0.0 FAB_PORT=8080

RUN fab build

EXPOSE 8080

CMD ["fab", "serve"]