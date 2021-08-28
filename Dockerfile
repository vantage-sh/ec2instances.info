FROM centos:7

MAINTAINER Brooke McKim <brooke@vantage.sh>

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY

ENV nginxversion="1.18.0-2" \
    os="centos" \
    osversion="7" \
    elversion="7"

ENV PACKAGES python3-devel libxml2-devel libxslt-devel openssl-devel gcc


RUN yum install -y wget openssl sed &&\
    yum -y autoremove &&\
    yum clean all &&\
    wget http://nginx.org/packages/$os/$osversion/x86_64/RPMS/nginx-$nginxversion.el$elversion.ngx.x86_64.rpm &&\
    rpm -iv nginx-$nginxversion.el$elversion.ngx.x86_64.rpm

RUN yum -y install epel-release && \
    yum -y update && \
    yum -y install ${PACKAGES} && \
    yum -y clean all && \
    rm -rf /var/tmp/* /var/cache/yum/* /root/.cache && \
    python3 -m ensurepip

RUN python3 -m pip install -U pip setuptools

COPY nginx.conf /etc/nginx/nginx.conf

WORKDIR /opt/app

COPY . .

RUN pip3 install -r requirements.txt
RUN invoke build

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
