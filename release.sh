#!/bin/bash

set -e
set -x

TAG=$(git describe --tags)

export NODE_OPTIONS=--openssl-legacy-provider

yarn
yarn build

# git checkout master

sudo -S true

# Compile zip artifacts
make

# Run artifact uploads if we are on the tag
if [[ $TAG != *-* ]]
then
	make upload
fi
