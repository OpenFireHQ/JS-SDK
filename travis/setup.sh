#!/bin/sh
npm install -g grunt-cli
git clone https://github.com/OpenFireHQ/Server.git
cd Server
npm install
npm link
openfire hack &
echo "Sleeping 2 seconds to make the server load"
sleep 2
