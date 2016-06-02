FROM phusion/baseimage

RUN rm /usr/sbin/policy-rc.d \
  && curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash \
  && apt-get update \
  && apt-get install -y \
    curl \
    fabric \
    git-core \
    make \
    mysql-server \
    nodejs \
    python-imaging \
    python-mysqldb \
    python-pip \
    python-pycurl \
    python-virtualenv \
    sqlite3 \
    unzip \
    vim \
    wget \
    zip

COPY ./provision/docker/01_start_mysql.sh /etc/my_init.d/

RUN /etc/init.d/mysql start \
  && mysql -uroot -e "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('root'); \
                      SET PASSWORD FOR 'root'@'127.0.0.1' = PASSWORD('root')" \
  && /etc/init.d/mysql stop \
  && cd /var/lib \
  && mv mysql mysql-hd \
  && ln -s mysql-hd mysql \
  && chmod +x /etc/my_init.d/01_start_mysql.sh \
  && useradd -G sudo -u 1000 -m vagrant \
  && echo "vagrant ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers \
  && mkdir -p /vagrant-dev /vagrant/src /vagrant/bin

COPY ./provision/docker/vagrant.bashrc /home/vagrant/.bashrc

WORKDIR /vagrant

COPY ./package.json /vagrant-dev/
RUN cd /vagrant-dev \
  && npm install

COPY ./Makefile ./bower.json /vagrant/
RUN make bower_components DEV_PREFIX=/vagrant-dev

COPY ./src/requirements*.txt /vagrant/src/
COPY ./bin/init_env ./bin/setup_linked_packages.py /vagrant/bin/
COPY ./extras /vagrant/extras
RUN make setup_dev DEV_PREFIX=/vagrant-dev \
  && make appengine DEV_PREFIX=/vagrant-dev

RUN chown -R vagrant:vagrant /vagrant /vagrant-dev
