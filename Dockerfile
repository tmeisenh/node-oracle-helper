FROM tmeisenh/docker-node-oracle:latest

RUN apt-get update && \
  apt-get install -y vim && \
  mkdir -p /usr/local/oracle-helper

WORKDIR /usr/local/oracle-helper

VOLUME ["/oracle-helper"]

CMD ["tail", "-f", "/dev/null"]
