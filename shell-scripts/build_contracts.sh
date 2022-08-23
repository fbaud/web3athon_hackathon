#!/bin/bash

export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
echo "SCRIPT_DIR=$SCRIPT_DIR"

PATH=/usr/local/node/bin:$PATH

cd $SCRIPT_DIR/../

truffle compile

