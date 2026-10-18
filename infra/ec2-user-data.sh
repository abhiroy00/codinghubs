#!/bin/bash
# EC2 user-data (first boot only) for the codinghubs-prod instance.
# Installs Docker + the AWS CLI (Ubuntu's base AMI ships neither) and sets up
# swap headroom for a t3.micro. Kept here for reference if the instance ever
# needs to be recreated — see DEPLOY.md.
set -ex

apt-get update
apt-get install -y docker.io docker-compose-v2 unzip
systemctl enable --now docker
usermod -aG docker ubuntu || true

cd /tmp
curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o awscliv2.zip
unzip -q -o awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# t3.micro has 1GB RAM; add swap headroom for postgres+gunicorn+nginx together.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /opt/codinghubs
