FROM centos:7

MAINTAINER Sebastian Sasu <sebi@nologin.ro>

RUN yum -y install epel-release && yum -y update
RUN yum -y install python-devel \
  libxml2-devel \
  libxslt-devel \
  openssl-devel \
  python2-pip \
  gcc

WORKDIR /opt/app

COPY . /opt/app

RUN sed -i 's/127\.0\.0\.1/0\.0\.0\.0/' fabfile.py && sed -i 's/port=0/port=8080/' fabfile.py
RUN pip install -r requirements.txt && fab build

RUN yum -y remove \
  epel-release \
  python-devel \
  libxml2-devel \
  libxslt-devel \
  openssl-devel \
  python2-pip \
  gcc \
  kernel-headers \
  && yum -y clean all && rm -rf /var/tmp/* /var/cache/yum/* /root/.cache

EXPOSE 8080

CMD ["fab", "serve"]
